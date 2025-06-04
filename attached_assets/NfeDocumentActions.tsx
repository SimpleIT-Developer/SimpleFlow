import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, Printer, CheckSquare, MoreHorizontal } from "lucide-react";
import { useCheckNfeErpStatus } from '@/hooks/use-erp-status';
import ErpStatusTag from './ErpStatusTag';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface NfeDocumentActionsProps {
  documentId: number;
  statusErp?: string;
}

export const NfeDocumentActions: React.FC<NfeDocumentActionsProps> = ({ 
  documentId, 
  statusErp = 'PENDING' 
}) => {
  const { mutate: checkErpStatus, isPending } = useCheckNfeErpStatus();
  
  return (
    <div className="flex items-center space-x-2">
      <ErpStatusTag status={statusErp} />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => window.open(`/api/nfe-documents/${documentId}/danfe`, '_blank')}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir DANFE
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`/api/nfe-documents/${documentId}/xml`, '_blank')}>
            <Download className="mr-2 h-4 w-4" />
            Download XML
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => checkErpStatus(documentId)}
            disabled={isPending}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Verificar no ERP
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};