import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";

const floatingItems = ["📚", "🎓", "✏️", "📝", "🔬", "📐", "🏛️", "📖"];

const initialPositions = floatingItems.map(() => ({
  x: Math.random() * 80 + 10,
  y: Math.random() * 80 + 10,
  duration: Math.random() * 4 + 4,
  delay: Math.random() * 3,
  rotate: Math.random() * 30 - 15,
}));

export default function NotFoundPage() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState(initialPositions);

  // Subtle drift effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((p) => ({
          ...p,
          x: Math.max(5, Math.min(90, p.x + (Math.random() - 0.5) * 4)),
          y: Math.max(5, Math.min(90, p.y + (Math.random() - 0.5) * 4)),
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col items-center justify-center px-4">

      {/* Floating background emojis */}
      {floatingItems.map((emoji, i) => (
        <span
          key={i}
          className="absolute text-3xl select-none pointer-events-none"
          style={{
            left: `${positions[i].x}%`,
            top: `${positions[i].y}%`,
            transition: `left ${positions[i].duration}s ease-in-out, top ${positions[i].duration}s ease-in-out`,
            transitionDelay: `${positions[i].delay}s`,
            transform: `rotate(${positions[i].rotate}deg)`,
            opacity: 0.18,
          }}
        >
          {emoji}
        </span>
      ))}

      {/* Main card */}
      <div className="relative z-10 text-center max-w-lg w-full">

        {/* Graduation cap */}
        <div
          className="text-8xl mb-2 inline-block"
          style={{ animation: "wobble 2.5s ease-in-out infinite" }}
        >
          🎓
        </div>

        {/* 404 number */}
        <div className="relative flex items-center justify-center gap-1 my-4">
          <span
            className="text-[9rem] font-black leading-none select-none"
            style={{
              color: "#820000",
              textShadow: "6px 6px 0px #f2deba, 8px 8px 0px rgba(130,0,0,0.15)",
              animation: "bounceLeft 3s ease-in-out infinite",
            }}
          >
            4
          </span>
          <span
            className="text-[9rem] font-black leading-none select-none"
            style={{
              color: "#4e6c50",
              textShadow: "6px 6px 0px #f2deba, 8px 8px 0px rgba(78,108,80,0.15)",
              animation: "spin360 6s linear infinite",
              display: "inline-block",
            }}
          >
            0
          </span>
          <span
            className="text-[9rem] font-black leading-none select-none"
            style={{
              color: "#820000",
              textShadow: "6px 6px 0px #f2deba, 8px 8px 0px rgba(130,0,0,0.15)",
              animation: "bounceRight 3s ease-in-out infinite",
            }}
          >
            4
          </span>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-text mb-2">
          This page skipped class!
        </h1>
        <p className="text-gray-500 mb-8 text-base leading-relaxed">
          Looks like this page went on an unauthorized leave of absence.
          <br />
          Even the professors can't find it.
        </p>

        {/* Divider with stars */}
        <div className="flex items-center justify-center gap-3 mb-8 text-accent">
          <div className="h-px w-16 bg-accent" />
          <span className="text-xl">✦</span>
          <div className="h-px w-16 bg-accent" />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" onClick={() => navigate("/")}>
            Back to Campus
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs text-gray-400 tracking-wide uppercase">
          Gadag University &mdash; Page Not Found
        </p>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes wobble {
          0%, 100% { transform: rotate(-8deg) scale(1); }
          25%       { transform: rotate(8deg) scale(1.05); }
          50%       { transform: rotate(-4deg) scale(1); }
          75%       { transform: rotate(6deg) scale(1.03); }
        }
        @keyframes bounceLeft {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes bounceRight {
          0%, 100% { transform: translateY(-14px); }
          50%       { transform: translateY(0px); }
        }
        @keyframes spin360 {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}
