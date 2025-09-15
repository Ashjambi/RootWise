
import React, { useState, useMemo } from 'react';
import { IncidentReport, IncidentSeverity } from '../types';

export type RiskItem = {
    name: string;
    count: number;
    riskScore: number;
    highestSeverity: IncidentSeverity;
    incidents: IncidentReport[];
};

type SortKey = 'name' | 'count' | 'riskScore';
type SortDirection = 'ascending' | 'descending';

interface RiskTableProps {
  title: string;
  items: RiskItem[];
  onItemClick: (item: RiskItem) => void;
}

const SortableHeader: React.FC<{
  sortKey: SortKey;
  title: string;
  sortConfig: { key: SortKey; direction: SortDirection } | null;
  requestSort: (key: SortKey) => void;
}> = ({ sortKey, title, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === sortKey;
    const directionIcon = sortConfig?.direction === 'ascending' ? '▲' : '▼';

    return (
        <th
            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-500/10 transition-colors"
            onClick={() => requestSort(sortKey)}
        >
            <div className="flex items-center justify-end">
                <span>{isSorted ? directionIcon : ''}</span>
                <span className="mr-1">{title}</span>
            </div>
        </th>
    );
};


const RiskTable: React.FC<RiskTableProps> = ({ title, items, onItemClick }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'riskScore', direction: 'descending' });

    const sortedItems = useMemo(() => {
        let sortableItems = [...items];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [items, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'descending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const getRiskColorClass = (score: number, maxScore: number): string => {
        if (maxScore === 0) return 'bg-opacity-10 bg-gray-400';
        const ratio = score / maxScore;
        if (ratio > 0.7) return 'bg-opacity-70 bg-red-400 text-white';
        if (ratio > 0.5) return 'bg-opacity-60 bg-orange-400 text-white';
        if (ratio > 0.3) return 'bg-opacity-50 bg-yellow-400 text-gray-800';
        return 'bg-opacity-40 bg-green-400 text-gray-800';
    };

    const maxScore = items.length > 0 ? Math.max(...items.map(i => i.riskScore)) : 1;

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 font-cairo mb-4">{title}</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100/50">
                        <tr>
                            <SortableHeader sortKey="name" title="الاسم" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="count" title="العدد" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader sortKey="riskScore" title="الخطورة" sortConfig={sortConfig} requestSort={requestSort} />
                        </tr>
                    </thead>
                    <tbody className="bg-white/50 divide-y divide-gray-200/80">
                        {sortedItems.length > 0 ? sortedItems.map(item => (
                            <tr
                                key={item.name}
                                className="hover:bg-blue-500/10 cursor-pointer transition-colors"
                                onClick={() => onItemClick(item)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onItemClick(item)}
                            >
                                <td className="px-4 py-3 whitespace-normal text-sm font-medium text-gray-900">{item.name}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">{item.count}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-bold">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs ${getRiskColorClass(item.riskScore, maxScore)}`}>
                                        {item.riskScore}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={3} className="text-center text-sm text-gray-500 py-8">
                                    لا توجد بيانات كافية للتحليل.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RiskTable;
