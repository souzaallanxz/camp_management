import React from 'react';
import { Button } from '@/components/ui/button';

const OrganizationForm: React.FC = () => {
  const isLoading = false;
  const isSaving = false;

  return (
    <form>
      {/* ... existing form content ... */}
      <Button type="submit" disabled={isLoading || isSaving}>
        {isSaving ? 'A guardar...' : 'Guardar'}
      </Button>
    </form>
  );
};

export default OrganizationForm; 