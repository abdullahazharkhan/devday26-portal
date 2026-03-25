'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competition {
    id: string
    name: string
    compDay: string
    fee: string
    earlyBirdFee: string
    earlyBirdLimit: number
    minTeamSize: number
    maxTeamSize: number
    startTime: string
    endTime: string
}

interface Clash {
    participantName: string
    participantCnic: string
    clashTeam: string
    clashCompetition: string
    clashStart: string
    clashEnd: string
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const memberSchema = z.object({
    fullName:    z.string().min(1, 'Full name is required'),
    email:       z.string().email('Invalid email'),
    cnic:        z.string().min(13, 'CNIC must be at least 13 characters'),
    phone:       z.string(),
    institution: z.string(),
    isLeader:    z.boolean(),
})

const formSchema = z.object({
    teamName:      z.string().min(1, 'Team name is required'),
    competitionId: z.string().min(1, 'Please select a competition'),
    referenceId:   z.string().optional(),
    paymentMethod: z.enum(['BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'CARD', 'CASH'], {
        message: 'Please select a payment method',
    }),
    amountPaid:    z.string().min(1, 'Amount paid is required'),
    isEarlyBird:   z.boolean(),
    members:       z.array(memberSchema).min(1, 'At least one member is required'),
})

type FormData = z.infer<typeof formSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fieldCls = (hasError: boolean) =>
    `bg-[#191111] border ${
        hasError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-primaryred-muted focus:border-primaryred focus:ring-primaryred'
    } p-3 text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 w-full`

const selectCls = (hasError: boolean) =>
    `${fieldCls(hasError)} appearance-none`

const PAYMENT_METHODS = [
    { value: 'BANK_TRANSFER', label: 'BANK TRANSFER' },
    { value: 'EASYPAISA',     label: 'EASYPAISA' },
    { value: 'JAZZCASH',      label: 'JAZZCASH' },
    { value: 'CARD',          label: 'CARD' },
    { value: 'CASH',          label: 'CASH' },
]

const INSTITUTIONS = ['FAST', 'NED', 'IBA', 'SSUET', 'Others']

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FormSkeleton() {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                    <div className="h-3 w-28 bg-[#3a2525] rounded-sm" />
                    <div className="h-11 bg-[#3a2525] rounded-sm" />
                </div>
            ))}
            <div className="border border-primaryred-muted p-5 flex flex-col gap-4">
                <div className="h-4 w-36 bg-[#3a2525] rounded-sm" />
                <div className="h-11 bg-[#3a2525] rounded-sm" />
                <div className="h-11 bg-[#3a2525] rounded-sm" />
            </div>
        </div>
    )
}

// ─── Clash Alert Dialog ───────────────────────────────────────────────────────

function ClashAlert({
    clashes,
    onConfirm,
    onCancel,
}: {
    clashes: Clash[]
    onConfirm: () => void
    onCancel: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

            {/* Dialog */}
            <div className="relative z-10 w-full max-w-lg mx-4 border border-red-600 bg-[#1a0f0f] shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-red-600/50 bg-red-600/10">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-red-400 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                        <h2 className="text-red-400 text-sm font-bold tracking-[0.2em]">
                            SCHEDULE_CLASH_DETECTED
                        </h2>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 max-h-80 overflow-y-auto flex flex-col gap-3">
                    <p className="text-[#C4C4C4] text-xs tracking-wider leading-relaxed">
                        The following team members are already registered in competitions with overlapping time slots:
                    </p>

                    {clashes.map((c, i) => (
                        <div key={i} className="border border-red-600/30 bg-red-600/5 p-4 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-white text-xs font-bold tracking-widest">{c.participantName}</span>
                                <span className="text-[10px] tracking-widest text-[#C4C4C4] font-mono">{c.participantCnic}</span>
                            </div>
                            <p className="text-xs text-[#C4C4C4] tracking-wider">
                                Already in <span className="text-red-400 font-semibold">{c.clashCompetition}</span> (Team: {c.clashTeam})
                            </p>
                            <p className="text-[10px] tracking-widest text-[#C4C4C4]">
                                {fmtTime(c.clashStart)} — {fmtTime(c.clashEnd)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-red-600/30 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-xs tracking-widest text-[#C4C4C4] border border-primaryred-muted px-5 py-2.5 hover:border-white hover:text-white transition-colors duration-200"
                    >
                        CANCEL
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="text-xs tracking-widest text-white bg-red-600 border border-red-600 px-5 py-2.5 hover:bg-red-700 transition-colors duration-200"
                    >
                        REGISTER_ANYWAY
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Success Card ─────────────────────────────────────────────────────────────

function SuccessCard({
    data,
    onReset,
}: {
    data: { id: string; name: string; referenceId: string; competition: string; memberCount: number }
    onReset: () => void
}) {
    return (
        <div className="border border-green-600 bg-green-600/5 p-6 sm:p-8 flex flex-col gap-5">
            <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-green-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h2 className="text-green-400 text-sm font-bold tracking-[0.2em]">REGISTRATION_CREATED</h2>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">TEAM</span>
                    <span className="text-white text-sm font-semibold">{data.name}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">COMPETITION</span>
                    <span className="text-white text-sm font-semibold">{data.competition}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">REFERENCE_ID</span>
                    <span className="text-primaryred text-sm font-mono tracking-widest">{data.referenceId}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">MEMBERS</span>
                    <span className="text-white text-sm font-semibold">{data.memberCount}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={onReset}
                className="self-start text-xs tracking-widest text-primaryred border border-primaryred px-5 py-2.5 hover:bg-primaryred hover:text-white transition-colors duration-200 mt-2"
            >
                CREATE_ANOTHER
            </button>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateRegistrationTab() {
    // Competition list
    const [competitions, setCompetitions] = useState<Competition[]>([])
    const [compsLoading, setCompsLoading] = useState(true)

    // Clash state
    const [clashes,     setClashes]     = useState<Clash[] | null>(null)
    const [pendingData, setPendingData] = useState<FormData | null>(null)

    // Submit state
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [serverError,  setServerError]  = useState('')
    const [successData,  setSuccessData]  = useState<{
        id: string; name: string; referenceId: string; competition: string; memberCount: number
    } | null>(null)

    // Form
    const {
        register,
        handleSubmit,
        control,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            teamName: '',
            competitionId: '',
            referenceId: '',
            paymentMethod: undefined,
            amountPaid: '',
            isEarlyBird: false,
            members: [{ fullName: '', email: '', cnic: '', phone: '', institution: '', isLeader: true }],
        },
    })

    const { fields, append, remove } = useFieldArray({ control, name: 'members' })

    const selectedCompId = watch('competitionId')
    const isEarlyBird = watch('isEarlyBird')
    const selectedComp = competitions.find((c) => c.id === selectedCompId)

    // Auto-set amountPaid when competition or early-bird choice changes
    useEffect(() => {
        if (selectedComp) {
            if (selectedComp.earlyBirdLimit <= 0) {
                setValue('isEarlyBird', false)
            }

            const amount = isEarlyBird && selectedComp.earlyBirdLimit > 0
                ? selectedComp.earlyBirdFee
                : selectedComp.fee

            setValue('amountPaid', String(amount))
        }
    }, [selectedComp, isEarlyBird, setValue])

    // ── Fetch competitions ─────────────────────────────────────────────────
    useEffect(() => {
        setCompsLoading(true)
        fetch('/api/registrations/competitions-form')
            .then((r) => r.json())
            .then((json) => { if (json.success) setCompetitions(json.data) })
            .catch(() => {/* silent */})
            .finally(() => setCompsLoading(false))
    }, [])

    // ── Adjust member slots when competition changes ───────────────────────
    useEffect(() => {
        if (!selectedComp) return
        const currentLen = fields.length
        const min = selectedComp.minTeamSize

        // Add slots if below minimum
        if (currentLen < min) {
            for (let i = currentLen; i < min; i++) {
                append({ fullName: '', email: '', cnic: '', phone: '', institution: '', isLeader: false }, { shouldFocus: false })
            }
        }
    }, [selectedComp, fields.length, append])

    // ── Submit flow ────────────────────────────────────────────────────────

    const doSubmit = useCallback(async (data: FormData) => {
        setIsSubmitting(true)
        setServerError('')

        try {
            const res = await fetch('/api/registrations/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const json = await res.json()

            if (!json.success) {
                setServerError(json.message || json.errors?.[0]?.message || 'Registration failed.')
                return
            }

            setSuccessData(json.data)
        } catch {
            setServerError('Could not reach the server.')
        } finally {
            setIsSubmitting(false)
        }
    }, [])

    const onSubmit = useCallback(async (data: FormData) => {
        setServerError('')

        // Assign isLeader: first member is leader, rest are not
        data.members.forEach((m, i) => { m.isLeader = i === 0 })

        // Step 1: Check clashes
        try {
            const cnics = data.members.map((m) => m.cnic)
            const res = await fetch('/api/registrations/check-clashes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ competitionId: data.competitionId, cnics }),
            })
            const json = await res.json()

            if (json.success && json.clashes && json.clashes.length > 0) {
                // Show clash dialog
                setClashes(json.clashes)
                setPendingData(data)
                return
            }
        } catch {
            // If clash-check fails, proceed anyway
        }

        // No clashes — submit directly
        await doSubmit(data)
    }, [doSubmit])

    const handleClashConfirm = useCallback(() => {
        if (pendingData) {
            setClashes(null)
            doSubmit(pendingData)
            setPendingData(null)
        }
    }, [pendingData, doSubmit])

    const handleClashCancel = useCallback(() => {
        setClashes(null)
        setPendingData(null)
    }, [])

    const handleReset = useCallback(() => {
        setSuccessData(null)
        setServerError('')
        reset()
    }, [reset])

    // ── Success view ───────────────────────────────────────────────────────
    if (successData) {
        return <SuccessCard data={successData} onReset={handleReset} />
    }

    // ── Loading ────────────────────────────────────────────────────────────
    if (compsLoading) {
        return <FormSkeleton />
    }

    // ── Form view ──────────────────────────────────────────────────────────
    return (
        <>
            {/* Clash dialog */}
            {clashes && clashes.length > 0 && (
                <ClashAlert
                    clashes={clashes}
                    onConfirm={handleClashConfirm}
                    onCancel={handleClashCancel}
                />
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                {/* Server error */}
                {serverError && (
                    <div className="border border-red-600 bg-red-600/10 px-4 py-3 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-red-400 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                        <p className="text-red-400 text-xs tracking-wider">{serverError}</p>
                    </div>
                )}

                {/* ── Section: Team Details ─────────────────────────────────── */}
                <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-6 flex flex-col gap-5">
                    <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold">TEAM_DETAILS</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Team name */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">TEAM_NAME *</label>
                            <input
                                {...register('teamName')}
                                placeholder="Enter team name"
                                className={fieldCls(!!errors.teamName)}
                            />
                            {errors.teamName && (
                                <p className="text-red-400 text-[10px] tracking-wider">{errors.teamName.message}</p>
                            )}
                        </div>

                        {/* Competition */}
                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">COMPETITION *</label>
                            <select
                                {...register('competitionId')}
                                className={selectCls(!!errors.competitionId)}
                            >
                                <option value="">SELECT COMPETITION</option>
                                {competitions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} — {fmtDate(c.compDay)} ({fmtTime(c.startTime)} – {fmtTime(c.endTime)})
                                    </option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 bottom-3 text-primaryred">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                                </svg>
                            </span>
                            {errors.competitionId && (
                                <p className="text-red-400 text-[10px] tracking-wider">{errors.competitionId.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Competition info badge */}
                    {selectedComp && (
                        <div className="flex flex-wrap gap-3">
                            <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                                FEE: PKR {selectedComp.fee}
                            </span>
                            <span className="text-[10px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-2 py-0.5">
                                TEAM SIZE: {selectedComp.minTeamSize}–{selectedComp.maxTeamSize}
                            </span>
                            <span className="text-[10px] tracking-widest text-[#C4C4C4] border border-primaryred-muted px-2 py-0.5">
                                {fmtTime(selectedComp.startTime)} — {fmtTime(selectedComp.endTime)}
                            </span>
                        </div>
                    )}

                    {/* Attendance status */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">ATTENDANCE_STATUS:</span>
                        <span className="text-[10px] tracking-widest text-yellow-400 border border-yellow-600 bg-yellow-500/10 px-2 py-0.5">
                            NOT_ATTENDED
                        </span>
                    </div>
                </div>

                {/* ── Section: Payment Details ──────────────────────────────── */}
                <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-6 flex flex-col gap-5">
                    <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold">PAYMENT_DETAILS</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Reference ID */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">REFERENCE_ID </label>
                            <input
                                {...register('referenceId')}
                                placeholder="Enter reference ID"
                                className={fieldCls(!!errors.referenceId)}
                            />
                            {errors.referenceId && (
                                <p className="text-red-400 text-[10px] tracking-wider">{errors.referenceId.message}</p>
                            )}
                        </div>

                        {/* Payment method */}
                        <div className="flex flex-col gap-1.5 relative">
                            <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">PAYMENT_METHOD *</label>
                            <select
                                {...register('paymentMethod')}
                                className={selectCls(!!errors.paymentMethod)}
                            >
                                <option value="">SELECT METHOD</option>
                                {PAYMENT_METHODS.map((pm) => (
                                    <option key={pm.value} value={pm.value}>{pm.label}</option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 bottom-3 text-primaryred">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                                </svg>
                            </span>
                            {errors.paymentMethod && (
                                <p className="text-red-400 text-[10px] tracking-wider">{errors.paymentMethod.message}</p>
                            )}
                        </div>

                        {/* Amount paid */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">AMOUNT_PAID *</label>
                            <input
                                {...register('amountPaid')}
                                placeholder="e.g. 500"
                                className={fieldCls(!!errors.amountPaid)}
                            />
                            {errors.amountPaid && (
                                <p className="text-red-400 text-[10px] tracking-wider">{errors.amountPaid.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Payment status badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">PAYMENT_STATUS:</span>
                        <span className="text-[10px] tracking-widest text-green-400 border border-green-600 bg-green-500/10 px-2 py-0.5">
                            VERIFIED
                        </span>
                    </div>

                    {/* Early bird option */}
                    {selectedComp && selectedComp.earlyBirdLimit > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">EARLY BIRD *</label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={isEarlyBird === true}
                                        onChange={() => setValue('isEarlyBird', true)}
                                        className="w-4 h-4 accent-primaryred cursor-pointer"
                                    />
                                    <span className="text-white text-xs tracking-wide">YES</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={isEarlyBird === false}
                                        onChange={() => setValue('isEarlyBird', false)}
                                        className="w-4 h-4 accent-primaryred cursor-pointer"
                                    />
                                    <span className="text-white text-xs tracking-wide">NO</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Section: Team Members ──────────────────────────────────── */}
                <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-6 flex flex-col gap-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="text-primaryred text-xs tracking-[0.2em] font-bold">TEAM_MEMBERS</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] tracking-widest text-[#C4C4C4]">
                                {fields.length} MEMBER{fields.length !== 1 ? 'S' : ''}
                                {selectedComp && ` / MAX ${selectedComp.maxTeamSize}`}
                            </span>
                            {selectedComp && fields.length < selectedComp.maxTeamSize && (
                                <button
                                    type="button"
                                    onClick={() => append({ fullName: '', email: '', cnic: '', phone: '', institution: '', isLeader: false }, { shouldFocus: false })}
                                    className="text-[10px] tracking-widest text-primaryred border border-primaryred px-3 py-1.5 hover:bg-primaryred hover:text-white transition-colors duration-200"
                                >
                                    + ADD MEMBER
                                </button>
                            )}
                        </div>
                    </div>

                    {fields.map((field, idx) => {
                        const isLeader = idx === 0
                        const memberErrors = errors.members?.[idx]

                        return (
                            <div
                                key={field.id}
                                className={`border p-4 sm:p-5 flex flex-col gap-4 ${
                                    isLeader
                                        ? 'border-primaryred/40 bg-primaryred/5'
                                        : 'border-primaryred-muted bg-[#191111]'
                                }`}
                            >
                                {/* Member header */}
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white text-xs font-bold tracking-widest">
                                            MEMBER_{String(idx + 1).padStart(2, '0')}
                                        </span>
                                        {isLeader && (
                                            <span className="text-[10px] tracking-widest text-primaryred border border-primaryred px-2 py-0.5">
                                                LEADER
                                            </span>
                                        )}
                                    </div>
                                    {!isLeader && fields.length > (selectedComp?.minTeamSize ?? 1) && (
                                        <button
                                            type="button"
                                            onClick={() => remove(idx)}
                                            className="text-[10px] tracking-widest text-red-400 border border-red-600/40 px-2.5 py-1 hover:bg-red-600/20 transition-colors duration-200"
                                        >
                                            REMOVE
                                        </button>
                                    )}
                                </div>

                                {/* Fields grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">FULL_NAME *</label>
                                        <input
                                            {...register(`members.${idx}.fullName`)}
                                            placeholder="Full name"
                                            className={fieldCls(!!memberErrors?.fullName)}
                                        />
                                        {memberErrors?.fullName && (
                                            <p className="text-red-400 text-[10px] tracking-wider">{memberErrors.fullName.message}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">EMAIL *</label>
                                        <input
                                            {...register(`members.${idx}.email`)}
                                            type="email"
                                            placeholder="email@example.com"
                                            className={fieldCls(!!memberErrors?.email)}
                                        />
                                        {memberErrors?.email && (
                                            <p className="text-red-400 text-[10px] tracking-wider">{memberErrors.email.message}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">CNIC *</label>
                                        <input
                                            {...register(`members.${idx}.cnic`)}
                                            placeholder="XXXXX-XXXXXXX-X"
                                            className={fieldCls(!!memberErrors?.cnic)}
                                        />
                                        {memberErrors?.cnic && (
                                            <p className="text-red-400 text-[10px] tracking-wider">{memberErrors.cnic.message}</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">PHONE</label>
                                        <input
                                            {...register(`members.${idx}.phone`)}
                                            placeholder="Optional"
                                            className={fieldCls(false)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5 sm:col-span-2 relative">
                                        <label className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">INSTITUTION</label>
                                        <select
                                            {...register(`members.${idx}.institution`)}
                                            className={selectCls(false)}
                                        >
                                            <option value="">Select institution</option>
                                            {INSTITUTIONS.map((inst) => (
                                                <option key={inst} value={inst}>{inst}</option>
                                            ))}
                                        </select>
                                        <span className="pointer-events-none absolute right-3 bottom-3 text-primaryred">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {errors.members?.root && (
                        <p className="text-red-400 text-[10px] tracking-wider">{errors.members.root.message}</p>
                    )}
                </div>

                {/* ── Submit Button ──────────────────────────────────────────── */}
                <div className="flex items-center justify-end gap-4">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-xs tracking-widest text-[#C4C4C4] border border-primaryred-muted px-5 py-3 hover:border-white hover:text-white transition-colors duration-200"
                    >
                        RESET
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="text-xs tracking-widest text-white bg-primaryred border border-primaryred px-6 py-3 hover:bg-primaryred/80 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting && (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        {isSubmitting ? 'REGISTERING...' : 'CREATE_REGISTRATION'}
                    </button>
                </div>
            </form>
        </>
    )
}
