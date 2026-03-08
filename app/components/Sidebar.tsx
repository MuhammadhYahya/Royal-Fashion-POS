"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { 
  Wallet, 
  ShoppingCart, 
  Package, 
  Boxes, 
  BarChart3, 
  RotateCcw, 
  Settings 
} from "lucide-react";

const navItems = [
  { name: "Sales", href: "/", icon: Wallet },
  { name: "Start Sale", href: "/cashier", icon: ShoppingCart },
  { name: "Products", href: "/products", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Boxes },
  { name: "Reports", href: "/report", icon: BarChart3 },
  { name: "Returns", href: "/returns", icon: RotateCcw },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar no-print">
      <div className="sidebar-header">
        <div className="brand">
          <ShoppingCart className="w-6 h-6 text-primary" />
          <span>Bag Shop POS</span>
        </div>
      </div>
      
      <nav className="nav-links">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? "active" : ""}`}
            >
              <Icon />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="text-sm text-muted font-medium">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
