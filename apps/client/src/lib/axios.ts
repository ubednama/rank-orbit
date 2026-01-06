import axios from 'axios';

const api = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3333'}/api`,
    timeout: 300000, // 5 minutes (AI processing can be slow)
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
