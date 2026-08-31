import { useState } from "react";

type MenuItem = {
  label: string;
  onClick: () => void;
};

type MenuProps = {
  items: MenuItem[];
};

export default function Menu({ items }: MenuProps) {

  const [open,setOpen] = useState(false);

  return (
    <div className="relative inline-block">

      <button
        onClick={()=>setOpen(!open)}
        className="px-3 py-1 border rounded-lg"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg z-20">

          {items.map((item,index)=>(
            <button
              key={index}
              onClick={()=>{
                item.onClick();
                setOpen(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              {item.label}
            </button>
          ))}

        </div>
      )}

    </div>
  );
}