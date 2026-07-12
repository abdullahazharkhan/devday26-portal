'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiFetch } from '@/lib/apiClient'

// ─── Schema ──────────────────────────────────────────────────────────────────

const createAccountSchema = z
    .object({
        fullName: z.string().min(1, 'Full name is required').max(100),
        email: z.string().regex(
            /^[kilp](20|21|22|23|24|25)\d{4}@nu\.edu\.pk$/,
            'Must be a valid NU email e.g. k230691@nu.edu.pk'
        ),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Please confirm the password'),
        role: z.enum(['excom', 'pr', 'gr', 'food', 'cs', 'superadmin'], {
            message: 'Please select a valid role.',
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
    })

type FormData = z.infer<typeof createAccountSchema>

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatedCredentials {
    fullName: string
    email: string
    nuId: string
    staffRole: string
    password: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fieldCls = (hasError: boolean) =>
    `bg-[#191111] border ${
        hasError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-primaryred-muted focus:border-primaryred focus:ring-primaryred'
    } p-3 text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 w-full`

const ROLE_LABELS: Record<string, string> = {
    excom:      'EXCOM',
    pr:         'PR_TEAM',
    gr:         'GR_TEAM',
    food:       'FOOD_TEAM',
    cs:         'COMPETITIONS_TEAM',
    superadmin: 'SUPER_ADMIN',
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for older environments
            const el = document.createElement('textarea')
            el.value = value
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            className={`px-3 py-1 text-xs tracking-widest font-semibold border transition-all duration-200 shrink-0 ${
                copied
                    ? 'border-green-500 text-green-400 bg-green-500/10'
                    : 'border-primaryred-muted text-primaryred hover:border-primaryred hover:bg-primaryred/10'
            }`}
        >
            {copied ? 'COPIED' : 'COPY'}
        </button>
    )
}

// ─── Credential Row ───────────────────────────────────────────────────────────

function CredRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] tracking-[0.2em] text-[#C4C4C4]">{label}</span>
            <div className="flex items-center gap-3 bg-[#191111] border border-primaryred-muted px-4 py-2.5">
                <span className="flex-1 text-white text-sm font-mono break-all">{value}</span>
                <CopyButton value={value} />
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateAccountForm() {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [credentials, setCredentials] = useState<CreatedCredentials | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(createAccountSchema) })

    const onSubmit = async (data: FormData) => {
        setIsLoading(true)
        setServerError(null)
        setCredentials(null)

        try {
            const res = await apiFetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const json = await res.json()

            if (!res.ok) {
                const msg =
                    json?.message ??
                    json?.errors?.[0]?.message ??
                    'Registration failed. Please try again.'
                setServerError(msg)
                return
            }

            setCredentials({
                fullName:  json.data.fullName,
                email:     json.data.email,
                nuId:      json.data.nuId,
                staffRole: json.data.staffRole,
                password:  data.password,
            })

            reset()
        } catch {
            setServerError('Could not reach the server. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const [copiedAll, setCopiedAll] = useState(false)

    const copyAll = async () => {
        if (!credentials) return
        const text = [
            `FULL_NAME:  ${credentials.fullName}`,
            `NU_ID:      ${credentials.nuId}`,
            `EMAIL:      ${credentials.email}`,
            `ROLE:       ${credentials.staffRole}`,
            `PASSWORD:   ${credentials.password}`,
        ].join('\n')
        await navigator.clipboard.writeText(text)
        setCopiedAll(true)
        setTimeout(() => setCopiedAll(false), 2000)
    }

    return (
        <div className="flex flex-col gap-8">

            {/* ── Form ─────────────────────────────────────────────────────── */}
            <div className="border border-primaryred-muted bg-[#271C1C] p-5 sm:p-8">

                <h2 className="text-sm tracking-[0.2em] text-[#C4C4C4] mb-6">
                    {"// FILL IN DETAILS BELOW TO CREATE A STAFF ACCOUNT"}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 sm:gap-6">

                    {/* Row 1 — Full Name + Email */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <div className="flex flex-col gap-1 w-full sm:w-1/2">
                            <label className="text-primaryred text-xs tracking-widest">01 Full_Name</label>
                            <input
                                {...register('fullName')}
                                type="text"
                                placeholder="John Doe"
                                className={fieldCls(!!errors.fullName)}
                            />
                            {errors.fullName && (
                                <p className="text-red-500 text-xs">{errors.fullName.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1 w-full sm:w-1/2">
                            <label className="text-primaryred text-xs tracking-widest">02 NU_Email</label>
                            <input
                                {...register('email')}
                                type="email"
                                placeholder="kXXXXXX@nu.edu.pk"
                                className={fieldCls(!!errors.email)}
                            />
                            {errors.email && (
                                <p className="text-red-500 text-xs">{errors.email.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Row 2 — Password + Confirm Password */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <div className="flex flex-col gap-1 w-full sm:w-1/2">
                            <label className="text-primaryred text-xs tracking-widest">03 Password</label>
                            <div className="relative">
                                <input
                                    {...register('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="********"
                                    className={fieldCls(!!errors.password) + ' pr-16'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primaryred text-xs font-semibold tracking-wide"
                                >
                                    {showPassword ? 'HIDE' : 'SHOW'}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-500 text-xs">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1 w-full sm:w-1/2">
                            <label className="text-primaryred text-xs tracking-widest">04 Confirm_Password</label>
                            <div className="relative">
                                <input
                                    {...register('confirmPassword')}
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="********"
                                    className={fieldCls(!!errors.confirmPassword) + ' pr-16'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primaryred text-xs font-semibold tracking-wide"
                                >
                                    {showConfirmPassword ? 'HIDE' : 'SHOW'}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Row 3 — Role */}
                    <div className="flex flex-col gap-1">
                        <label className="text-primaryred text-xs tracking-widest">05 Role</label>
                        <div className="relative">
                            <select
                                {...register('role')}
                                defaultValue=""
                                className={`bg-[#191111] border ${
                                    errors.role
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                        : 'border-primaryred-muted focus:border-primaryred focus:ring-primaryred'
                                } p-3 pr-10 text-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 w-full appearance-none`}
                            >
                                <option value="" disabled className="text-gray-400">
                                    Select a role
                                </option>
                                <option value="excom">EXCOM</option>
                                <option value="pr">PR_TEAM</option>
                                <option value="gr">GR_TEAM</option>
                                <option value="food">FOOD_TEAM</option>
                                <option value="cs">COMPETITIONS_TEAM</option>
                                <option value="superadmin">SUPER_ADMIN</option>
                            </select>
                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-primaryred">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                                </svg>
                            </span>
                        </div>
                        {errors.role && (
                            <p className="text-red-500 text-xs">{errors.role.message}</p>
                        )}
                    </div>

                    {/* Server error */}
                    {serverError && (
                        <p className="text-red-500 text-xs tracking-wide border border-red-500 bg-red-500/10 px-4 py-2">
                            {serverError}
                        </p>
                    )}

                    {/* Submit */}
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-primaryred text-white text-sm py-3 px-8 tracking-widest hover:bg-primaryred-muted transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'CREATING_ACCOUNT...' : 'CREATE_ACCOUNT'}
                        </button>
                    </div>

                </form>
            </div>

            {/* ── Credentials Card ─────────────────────────────────────────── */}
            {credentials && (
                <div className="border border-primaryred bg-[#271C1C] p-5 sm:p-8 flex flex-col gap-5">

                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-white text-base font-bold tracking-widest">ACCOUNT_CREATED</h2>
                            <div className="w-10 h-0.5 bg-primaryred mt-1.5" />
                            <p className="text-[#C4C4C4] text-xs tracking-wider mt-2">
                                {'// SAVE THESE CREDENTIALS — PASSWORD IS NOT RECOVERABLE AFTER LEAVING THIS PAGE'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={copyAll}
                            className={`px-4 py-2 text-xs tracking-widest font-semibold border transition-all duration-200 shrink-0 ${
                                copiedAll
                                    ? 'border-green-500 text-green-400 bg-green-500/10'
                                    : 'border-primaryred text-primaryred hover:bg-primaryred/10'
                            }`}
                        >
                            {copiedAll ? 'COPIED' : 'COPY_ALL'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <CredRow label="FULL_NAME"  value={credentials.fullName} />
                        <CredRow label="NU_ID"      value={credentials.nuId} />
                        <CredRow label="EMAIL"      value={credentials.email} />
                        <CredRow label="ROLE"       value={ROLE_LABELS[credentials.staffRole.toLowerCase()] ?? credentials.staffRole} />
                    </div>

                    {/* Password gets full width + red warning */}
                    <CredRow label="PASSWORD  ⚠ COPY NOW — THIS WILL NOT BE SHOWN AGAIN" value={credentials.password} />

                </div>
            )}

        </div>
    )
}
