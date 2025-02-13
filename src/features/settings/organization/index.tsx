"use client";

import { Separator } from "@/components/ui/separator"
import { OrganizationForm } from "./organization-form"

export default function OrganizationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Organização</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as configurações da sua organização.
        </p>
      </div>
      <Separator />
      <OrganizationForm />
    </div>
  )
} 