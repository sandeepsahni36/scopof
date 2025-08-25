// src/pages/templates/TemplatesPage.tsx
import React, { useEffect, useState } from "react";
// ...your other imports

export default function TemplatesPage() {
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsCreateTemplateOpen(true);
    window.addEventListener("open:add-template", handler as EventListener);
    return () => window.removeEventListener("open:add-template", handler as EventListener);
  }, []);

  // ...render your existing create template modal with isCreateTemplateOpen
}
