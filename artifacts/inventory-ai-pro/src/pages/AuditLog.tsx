import { AppLayout } from "@/components/AppLayout";
import { useListInventoryAuditLogs, getListInventoryAuditLogsQueryKey } from "@workspace/api-client-react";
import type { InventoryAuditLog } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { PlusCircle, MinusCircle, Edit3, Trash2, Clock } from "lucide-react";

export default function AuditLog() {
  const { data: logs, isLoading } = useListInventoryAuditLogs(
    { limit: 50 },
    { query: { queryKey: getListInventoryAuditLogsQueryKey({ limit: 50 }) } }
  );

  const getActionIcon = (action: InventoryAuditLog["action"]) => {
    switch (action) {
      case 'added': return <PlusCircle className="w-4 h-4 text-green-500" />;
      case 'removed': return <MinusCircle className="w-4 h-4 text-destructive" />;
      case 'edited': return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'deleted': return <Trash2 className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionText = (log: InventoryAuditLog) => {
    switch (log.action) {
      case 'added': 
        return `Added ${log.delta ? log.delta + ' units of' : ''} ${log.productName ?? 'a product'}`;
      case 'removed': 
        return `Removed ${log.delta ? Math.abs(log.delta) + ' units of' : ''} ${log.productName ?? 'a product'}`;
      case 'edited': 
        return `Updated details for ${log.productName ?? 'a product'}`;
      case 'deleted': 
        return `Deleted product ${log.productName ?? ''}`;
      default: 
        return `Action on ${log.productName ?? 'a product'}`;
    }
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-6">Audit Log</h1>
        
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                  <Skeleton className="w-4 h-4 rounded-full" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : logs?.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium text-foreground">No activity yet</h3>
              <p className="text-sm text-muted-foreground">Changes to your inventory will appear here.</p>
            </div>
          ) : (
            logs?.map((log) => (
              <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  {getActionIcon(log.action)}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm text-foreground">
                      {getActionText(log)}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <time className="text-xs text-muted-foreground font-mono">
                        {format(new Date(log.createdAt), "MMM d, yyyy • h:mm a")}
                      </time>
                      {log.userId && (
                        <span className="text-xs text-muted-foreground">
                          · {log.userId}
                        </span>
                      )}
                    </div>
                    {log.note && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded-md">
                        {log.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
