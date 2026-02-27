"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
    email: z
        .string()
        .regex(
            /^[kilp](20|21|22|23|24|25)\d{4}@nu\.edu\.pk$/,
            'Must be a valid NU email e.g. k230691@nu.edu.pk'
        ),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

const fieldClass = (hasError: boolean) =>
    `bg-[#191111] border ${
        hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-primaryred-muted focus:border-primaryred focus:ring-primaryred'
    } p-3 pr-20 text-white transition-all duration-200 focus:outline-none focus:ring-2 w-full`

const Login = () => {
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = (data: LoginFormData) => {
        console.log('Login data:', data)
    }

    return (
        <div className='bg-[#271C1C] w-full max-w-xl p-5 sm:p-8'>
            <h1 className='text-2xl sm:text-3xl font-semibold'>LOGIN_CREDENTIALS</h1>

            <div className='border-t-2 border-primaryred-muted my-4'></div>

            <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-5 sm:gap-6'>

                {/* NU Email */}
                <div className='flex flex-col gap-1'>
                    <label htmlFor="nuemaillogin" className='text-primaryred'>
                        01 NU_Email
                    </label>
                    <input
                        {...register('email')}
                        type="email"
                        id="nuemaillogin"
                        placeholder="kXXXXXX@nu.edu.pk"
                        className={fieldClass(!!errors.email)}
                    />
                    {errors.email && (
                        <p className='text-red-500 text-xs'>{errors.email.message}</p>
                    )}
                </div>

                {/* Password */}
                <div className='flex flex-col gap-1'>
                    <label htmlFor="nupasswordlogin" className='text-primaryred'>
                        02 Password
                    </label>
                    <div className='relative'>
                        <input
                            {...register('password')}
                            type={showPassword ? "text" : "password"}
                            id="nupasswordlogin"
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

                <button type='submit' className="bg-primaryred text-white py-3 px-6 w-full sm:w-auto hover:bg-primaryred-muted transition-colors duration-300">
                    LOGIN
                </button>

                <p className='text-sm text-foreground-muted text-center'>
                    Don&apos;t have an account?{' '}
                    <Link
                        href="/register"
                        className='text-primaryred hover:text-primaryred/80 transition-colors duration-200'
                    >
                        Register
                    </Link>
                </p>

            </form>
        </div>
    )
}

export default Login