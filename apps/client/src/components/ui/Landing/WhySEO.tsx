import { TrendingUp, Users, Target, Search } from "lucide-react";

const reasons = [
  {
    icon: Search,
    title: "Visibility",
    description:
      "75% of users never scroll past the first page of search results. Rank higher to get seen.",
  },
  {
    icon: Users,
    title: "Traffic",
    description:
      "Organic search drives 53% of all website traffic. Capture qualified leads without ads.",
  },
  {
    icon: Target,
    title: "Credibility",
    description: "Users trust search engines. Ranking high signals authority and trustworthiness.",
  },
  {
    icon: TrendingUp,
    title: "ROI",
    description:
      "SEO offers one of the highest returns on investment compared to paid advertising.",
  },
];

export default function WhySEO() {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-blue-50/50 to-transparent dark:via-blue-900/10 pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20 md:mb-28">
          <h2 className="text-3xl md:text-5xl font-bold mb-5 sm:mb-7 bg-clip-text text-gray-900 dark:text-white bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 leading-tight">
            Why SEO Matters?
          </h2>
          <p className="text-base md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
            Search Engine Optimization isn't just about rankings; it's about building a sustainable
            digital presence that drives real business growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="p-3 sm:p-6 rounded-2xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-indigo-500/50 transition-all hover:bg-white dark:hover:bg-white/10 group"
            >
              <div className="flex items-center gap-4 mb-2 sm:mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
                  <reason.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white md:hidden">
                  {reason.title}
                </h3>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white hidden md:block">
                {reason.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
