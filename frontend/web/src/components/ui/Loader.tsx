export default function Loader() {
  return (
    <div className="flex items-center justify-center">

      <div className="relative w-16 h-16">

        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>

        {/* Middle ring */}
        <div className="absolute inset-2 rounded-full border-4 border-secondary border-b-transparent animate-spin [animation-duration:1.5s]"></div>

      

      </div>

    </div>
  );
}