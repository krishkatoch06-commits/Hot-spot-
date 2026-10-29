import React from 'react';
import { RestaurantTable } from '../types';
import { Users, Check, X, MapPin } from 'lucide-react';

interface TableSelectorModalProps {
  isOpen: boolean;
  tables: RestaurantTable[];
  selectedTable: RestaurantTable | null;
  onSelectTable: (table: RestaurantTable) => void;
  onClose?: () => void;
  isMandatory?: boolean;
}

export const TableSelectorModal: React.FC<TableSelectorModalProps> = ({
  isOpen,
  tables,
  selectedTable,
  onSelectTable,
  onClose,
  isMandatory = false,
}) => {
  if (!isOpen) return null;

  const activeTables = tables.filter((t) => t.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EADBCE] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#EADBCE]">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#C85A32] uppercase">
              Table Selection
            </span>
            <h2 className="text-2xl font-serif font-bold text-[#1E1E24] mt-1">
              Select Your Table
            </h2>
            <p className="text-sm text-[#6B696F] mt-1">
              Please choose the table you are currently seated at.
            </p>
          </div>
          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-[#6B696F] hover:text-[#1E1E24] hover:bg-[#F3ECE1] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Notice */}
        <div className="bg-[#FBEFE9] border border-[#F3D5C6] rounded-2xl p-3.5 my-4 flex items-center gap-3 text-xs text-[#9B3C1B]">
          <MapPin className="w-4 h-4 shrink-0 text-[#C85A32]" />
          <span>
            Table numbers are verified directly with our dining floor database to guarantee your food arrives promptly at your seat.
          </span>
        </div>

        {/* Tables Grid */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-2 py-2">
          {activeTables.length === 0 ? (
            <div className="text-center py-12 text-[#6B696F]">
              <p>No active tables found.</p>
              <p className="text-xs mt-1">Please ask our floor staff for assistance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeTables.map((table) => {
                const isSelected = selectedTable?.id === table.id;
                return (
                  <button
                    key={table.id}
                    onClick={() => onSelectTable(table)}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
                      isSelected
                        ? 'border-[#C85A32] bg-[#FAF1EC] shadow-md scale-[1.02]'
                        : 'border-[#EADBCE] bg-white hover:border-[#C85A32]/60 hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-[#C85A32] text-white rounded-full flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    <div className="text-3xl font-serif font-black text-[#1E1E24]">
                      {table.tableNumber}
                    </div>
                    <div className="text-xs font-semibold text-[#1E1E24] mt-1 line-clamp-1">
                      {table.displayName}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#6B696F] mt-1.5">
                      <Users className="w-3 h-3" />
                      <span>{table.capacity} Seats</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        {selectedTable && (
          <div className="mt-4 pt-3 border-t border-[#EADBCE] flex items-center justify-between">
            <div className="text-xs text-[#6B696F]">
              Current Selection: <strong className="text-[#1E1E24] font-semibold">{selectedTable.displayName}</strong>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-[#C85A32] text-white rounded-xl text-sm font-semibold hover:bg-[#B04B26] transition-colors shadow-sm"
              >
                Confirm Table
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
