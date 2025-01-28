import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PaymentsTable } from './payments-table';
import { getRegistrationById, updateRegistration } from '../services/registration-service';
import { useToast } from '@/components/ui/use-toast';
import { getPaymentsByRegistrationId } from '../services/payment-service';
import { Payment } from '../data/schema';

interface RegistrationDetailProps {
  registrationId: string;
}

export function RegistrationDetail({ registrationId }: RegistrationDetailProps) {
  const { toast } = useToast();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Registration | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    loadRegistration();
    loadPayments();
  }, [registrationId]);

  const loadRegistration = async () => {
    const data = await getRegistrationById(registrationId);
    setRegistration(data);
    setFormData(data);
  };

  const loadPayments = async () => {
    const data = await getPaymentsByRegistrationId(registrationId);
    setPayments(data);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateRegistration(registrationId.toString(), formData!);
      toast({
        description: 'Inscrição atualizada com sucesso'
      });
      setIsEditing(false);
      loadRegistration();
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Erro ao atualizar inscrição'
      });
    }
  };

  if (!registration) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(registration).map(([key, value]) => {
              if (key === 'created_at') {
                return (
                  <div key={key}>
                    <Label>{key}</Label>
                    <Input value={String(value)} disabled />
                  </div>
                );
              }
              return (
                <div key={key}>
                  <Label>{key}</Label>
                  <Input
                    name={key}
                    value={formData[key]}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end space-x-2">
            {!isEditing ? (
              <Button type="button" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Pagamentos</h2>
        <PaymentsTable data={payments} />
      </Card>
    </div>
  );
} 