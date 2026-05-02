import { cn } from "@/lib/utils";

interface ChipSelectorProps {
  options: { label: string; icon?: string }[];
  selected: string[];
  onToggle: (label: string) => void;
}

const ChipSelector = ({ options, selected, onToggle }: ChipSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-[8px]">
      {options.map((option) => {
        const isSelected = selected.includes(option.label);
        return (
          <button
            key={option.label}
            onClick={() => onToggle(option.label)}
            className={cn(
              "inline-flex items-center gap-[8px] px-[16px] py-[8px] rounded-full text-sm font-medium transition-all duration-200 min-h-[44px]",
              isSelected
                ? "bg-primary text-primary-foreground shadow-card"
                : "bg-card text-foreground border border-border hover:border-primary/30"
            )}
          >
            {option.icon && <span>{option.icon}</span>}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default ChipSelector;
