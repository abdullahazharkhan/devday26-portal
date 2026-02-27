"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const registerSchema = z
    .object({
        fullName: z
            .string()
            .min(1, 'Full name is required'),
        email: z
            .string()
            .regex(
                /^[kilp](20|21|22|23|24|25)\d{4}@nu\.edu\.pk$/,
                'Must be a valid NU email e.g. k230691@nu.edu.pk'
            ),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters'),
        confirmPassword: z
            .string()
            .min(1, 'Please confirm your password'),
        role: z
            .string()
            .min(1, 'Role is required'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })

type RegisterFormData = z.infer<typeof registerSchema>

const fieldClass = (hasError: boolean) =>
    `bg-[#191111] border ${
        hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primaryred-muted focus:border-primaryred focus:ring-primaryred'
    } p-3 pr-20 text-white transition-all duration-200 focus:outline-none focus:ring-2 w-full`

const Register = () => {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = (data: RegisterFormData) => {
        console.log('Register data:', data)
    }

    return (
        <div className='bg-[#271C1C] w-full max-w-2xl p-5 sm:p-8'>
            <h1 className='text-2xl sm:text-3xl font-semibold'>REGISTER_CREDENTIALS</h1>

            <div className='border-t-2 border-primaryred-muted my-4'></div>

            <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5 sm:gap-6'>

                <div className='flex w-full flex-col sm:flex-row justify-between gap-4 sm:gap-2'>
                    {/* Full Name */}
                    <div className='flex flex-col gap-1 w-full sm:w-1/2'>
                        <label htmlFor="fullnameregister" className='text-primaryred'>
                            01 Full_Name
                        </label>
                        <input
                            {...register('fullName')}
                            type="text"
                            id="fullnameregister"
                            placeholder="John Doe"
                            className={fieldClass(!!errors.fullName)}
                        />
                        {errors.fullName && (
                            <p className='text-red-500 text-xs'>{errors.fullName.message}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div className='flex flex-col gap-1 w-full sm:w-1/2'>
                        <label htmlFor="nuemailregister" className='text-primaryred'>
                            02 NU_Email
                        </label>
                        <input
                            {...register('email')}
                            type="email"
                            id="nuemailregister"
                            placeholder="kXXXXXX@nu.edu.pk"
                            className={fieldClass(!!errors.email)}
                        />
                        {errors.email && (
                            <p className='text-red-500 text-xs'>{errors.email.message}</p>
                        )}
                    </div>
                </div>

                <div className='flex w-full flex-col sm:flex-row justify-between gap-4 sm:gap-2'>
                    {/* Password */}
                    <div className='flex flex-col gap-1 w-full sm:w-1/2'>
                        <label htmlFor="nupasswordregister" className='text-primaryred'>
                            03 Password
                        </label>
                        <div className='relative'>
                            <input
                                {...register('password')}
                                type={showPassword ? "text" : "password"}
                                id="nupasswordregister"
                                placeholder="********"
                                className={fieldClass(!!errors.password)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className='absolute right-3 top-1/2 -translate-y-1/2 text-primaryred text-xs font-semibold tracking-wide'
                            >
                                {showPassword ? "HIDE" : "SHOW"}
                            </button>
                        </div>
                        {errors.password && (
                            <p className='text-red-500 text-xs'>{errors.password.message}</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className='flex flex-col gap-1 w-full sm:w-1/2'>
                        <label htmlFor="nupasswordregisterconfirm" className='text-primaryred'>
                            04 Confirm_Password
                        </label>
                        <div className='relative'>
                            <input
                                {...register('confirmPassword')}
                                type={showConfirmPassword ? "text" : "password"}
                                id="nupasswordregisterconfirm"
                                placeholder="********"
                                className={fieldClass(!!errors.confirmPassword)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                className='absolute right-3 top-1/2 -translate-y-1/2 text-primaryred text-xs font-semibold tracking-wide'
                            >
                                {showConfirmPassword ? "HIDE" : "SHOW"}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className='text-red-500 text-xs'>{errors.confirmPassword.message}</p>
                        )}
                    </div>
                </div>

                {/* Role */}
                <div className='flex flex-col gap-1'>
                    <label htmlFor="role" className='text-primaryred'>
                        05 Role
                    </label>

                    <div className='relative'>
                        <select
                            {...register('role')}
                            id="role"
                            defaultValue=""
                            className={`bg-[#191111] border ${
                                errors.role ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primaryred-muted focus:border-primaryred focus:ring-primaryred'
                            } p-3 pr-10 text-white transition-all duration-200 focus:outline-none focus:ring-2 w-full appearance-none`}
                        >
                            <option value="" disabled className="text-gray-400">
                                Select your role
                            </option>
                            <option value="excom">Excom</option>
                            <option value="pr">PR team</option>
                            <option value="food">Food team</option>
                            <option value="cs">CS Competitions team</option>
                            <option value="ai">AI Competitions team</option>
                            <option value="gr">GR team</option>
                        </select>

                        <span className='pointer-events-none absolute inset-y-0 right-3 flex items-center text-primaryred'>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className='h-4 w-4'
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </span>
                    </div>
                    {errors.role && (
                        <p className='text-red-500 text-xs'>{errors.role.message}</p>
                    )}
                </div>

                <button
                    type='submit'
                    className="bg-primaryred text-white py-3 px-6 w-full sm:w-auto hover:bg-primaryred-muted transition-colors duration-300"
                >
                    REGISTER
                </button>

                <p className='text-sm text-foreground-muted text-center'>
                    Already have an account?{' '}
                    <Link
                        href="/login"
                        className='text-primaryred hover:text-primaryred/80 transition-colors duration-200'
                    >
                        Login
                    </Link>
                </p>

            </form>
        </div>
    )
}

export default Register