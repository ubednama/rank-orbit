import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { LighthouseMetrics, SeoMetadata as Metadata, AIAnalysis } from '@shared/types';

export interface SEOReportData {
    lighthouse_metrics: LighthouseMetrics;
    metadata: Metadata;
    ai_analysis: AIAnalysis | null;
}

export function useSEOAudit(url: string | null) {
    const [reportData, setReportData] = useState<SEOReportData | null>(null);
    const [error, setError] = useState<string>('');
    const [isNetworkError, setIsNetworkError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        let eventSource: EventSource | null = null;

        if (url) {
            setReportData(null);
            setError('');
            setIsNetworkError(false);
            setLoading(true);
            setAiLoading(false);

            const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3333';
            eventSource = new EventSource(`${gatewayUrl}/api/audit/stream?url=${encodeURIComponent(url)}`);

            eventSource.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    
                    switch (parsed.type) {
                        case 'status':
                            toast.info(parsed.message);
                            break;
                        
                        case 'crawler':
                            console.log('Crawler Response:', parsed.data);
                            setReportData(prev => ({
                                ...(prev || {}),
                                lighthouse_metrics: parsed.data.lighthouse_metrics,
                                metadata: parsed.data.metadata,
                                ai_analysis: null
                            } as SEOReportData));
                            setLoading(false); // Crawler done, page is ready
                            setAiLoading(true); // Now waiting for AI
                            break;

                        case 'ai':
                            console.log('AI Response:', parsed.data);
                            setReportData(prev => {
                                if (!prev) return null;
                                return {
                                    ...prev,
                                    ai_analysis: parsed.data.ai_analysis
                                };
                            });
                            setAiLoading(false);
                            toast.success('AI Analysis Complete!');
                            break;

                        case 'complete':
                            eventSource?.close();
                            setLoading(false);
                            setAiLoading(false);
                            break;
                    }
                } catch (e) {
                    console.error('Error parsing SSE event:', e);
                }
            };

            eventSource.onerror = (err) => {
                console.error('EventSource failed:', err);
                setError('Connection lost. Please try again.');
                setIsNetworkError(true); // Assuming connection issue
                toast.error('Connection failed.');
                eventSource?.close();
                setLoading(false);
                setAiLoading(false);
            };
        }

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [url]);

    return {
        data: reportData,
        loading,
        aiLoading,
        error,
        isNetworkError
    };
}
