import { useState } from "react";

type Tab = {
  label: string;
  value: string;
  content: React.ReactNode;
};

type TabsProps = {
  tabs: Tab[];
  defaultTab?: string;
  testId?: string;
};

export default function Tabs({ tabs, defaultTab, testId }: TabsProps) {

  const [activeTab, setActiveTab] = useState(
    defaultTab || tabs[0]?.value
  );

  const activeContent = tabs.find((t) => t.value === activeTab);

  return (
    <div className="w-full" data-testid={testId}>

      {/* Tab Headers */}
     <div className="flex overflow-x-auto border-b border-white/10" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>


        {tabs.map((tab) => {

          const active = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                px-5 py-3
                text-sm font-medium
                transition
                border-b-2
                ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-400 hover:text-text"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}

      </div>

      {/* Tab Content */}
      <div className="pt-5">
        {activeContent?.content}
      </div>

    </div>
  );
}