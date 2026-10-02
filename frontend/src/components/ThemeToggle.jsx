import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle({ className = "", showLabels = false }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options = [
    { id: "system", label: "System", icon: Laptop },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-full border border-border/70 bg-card/80 backdrop-blur-md shadow-sm ${className}`}
      role="group"
      aria-label="Theme selection"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            title={`Set theme to ${opt.label}${opt.id === "system" ? ` (${resolvedTheme})` : ""}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {showLabels && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
