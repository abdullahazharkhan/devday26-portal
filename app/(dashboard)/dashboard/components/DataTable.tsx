'use client'

import React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T = Record<string, unknown>> {
    key: string
    header: string
    /** Custom cell renderer. Receives the row and its 0-based index within the visible page. */
    render?: (row: T, index: number) => React.ReactNode
    /** Extra Tailwind classes applied to every <td> in this column */
    className?: string
    /** Extra Tailwind classes applied to the <th> header cell */
    headerClassName?: string
    /** Inline min-width for the column (e.g. "8rem") */
    minWidth?: string
}

export interface DataTableProps<T = Record<string, unknown>> {
    columns: Column<T>[]
    rows: T[]
    keyExtractor: (row: T) => string
    /** Shown when rows is empty and not loading */
    emptyMessage?: string
    loading?: boolean
    skeletonRowCount?: number
    /** If provided, rows become clickable and this handler is called on click */
    onRowClick?: (row: T) => void
}

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-[#3a2525] rounded-sm ${className ?? ''}`} />
}

function SkeletonRow({ colCount }: { colCount: number }) {
    return (
        <tr className="border-b border-primaryred-muted">
            {Array.from({ length: colCount }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className={`h-3 ${i === 0 ? 'w-6' : i === colCount - 1 ? 'w-16' : 'w-28'}`} />
                </td>
            ))}
        </tr>
    )
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export default function DataTable<T = Record<string, unknown>>({
    columns,
    rows,
    keyExtractor,
    emptyMessage = '// NO_DATA_FOUND',
    loading = false,
    skeletonRowCount = 8,
    onRowClick,
}: DataTableProps<T>) {
    return (
        <div className="border border-primaryred-muted bg-[#191111] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">

                {/* ── Header ────────────────────────────────────────────── */}
                <thead>
                    <tr className="bg-[#271C1C] border-b border-primaryred-muted">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-4 py-3 text-primaryred tracking-[0.18em] font-semibold whitespace-nowrap select-none ${col.headerClassName ?? ''}`}
                                style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* ── Body ──────────────────────────────────────────────── */}
                <tbody>
                    {loading ? (
                        Array.from({ length: skeletonRowCount }).map((_, i) => (
                            <SkeletonRow key={i} colCount={columns.length} />
                        ))
                    ) : rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-10 text-center text-[#C4C4C4] tracking-widest"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, rowIdx) => (
                            <tr
                                key={keyExtractor(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={`border-b border-primaryred-muted last:border-b-0 hover:bg-[#1D1313] transition-colors duration-150 ${onRowClick ? 'cursor-pointer' : ''}`}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`px-4 py-3 text-white align-middle whitespace-nowrap ${col.className ?? ''}`}
                                        style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                                    >
                                        {col.render
                                            ? col.render(row, rowIdx)
                                            : String((row as Record<string, unknown>)[col.key] ?? '—')}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
