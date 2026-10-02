import { Check } from "lucide-react";

const GenderCheck = ({ onCheckboxChange, selectedGender }) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Gender (for default avatar)
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onCheckboxChange("male")}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
            selectedGender === "male"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
              : "border-border/70 hover:border-border hover:bg-muted/50 text-muted-foreground"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">👨</span>
            <span>Male</span>
          </div>
          {selectedGender === "male" ? (
            <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full border border-border" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onCheckboxChange("female")}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
            selectedGender === "female"
              ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
              : "border-border/70 hover:border-border hover:bg-muted/50 text-muted-foreground"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">👩</span>
            <span>Female</span>
          </div>
          {selectedGender === "female" ? (
            <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full border border-border" />
          )}
        </button>
      </div>
    </div>
  );
};

export default GenderCheck;