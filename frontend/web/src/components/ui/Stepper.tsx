import React from "react";

type Step = {
  label: string;
};

type StepperProps = {
  steps: Step[];
  currentStep: number;
  testId?: string;
};

export default function Stepper({
  steps,
  currentStep,
  testId,
}: StepperProps) {

  return (
    <div className="flex items-center justify-between w-full" data-testid={testId}>

      {steps.map((step, index) => {

        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <div key={index} className="flex items-center w-full">

            {/* Circle */}
            <div
              className={`
                flex items-center justify-center
                w-8 h-8 rounded-full
                text-sm font-semibold
                ${isCompleted ? "bg-primary text-white" : ""}
                ${isActive ? "bg-accent text-black" : ""}
                ${!isActive && !isCompleted ? "bg-gray-300 text-gray-600" : ""}
              `}
            >
              {index + 1}
            </div>

            {/* Label */}
            <span
              className={`
                ml-2 text-sm font-medium
                ${isActive ? "text-accent" : "text-text"}
              `}
            >
              {step.label}
            </span>

            {/* Line */}
            {index !== steps.length - 1 && (
              <div className="flex-1 h-[2px] bg-gray-300 mx-3"></div>
            )}

          </div>
        );
      })}
    </div>
  );
}