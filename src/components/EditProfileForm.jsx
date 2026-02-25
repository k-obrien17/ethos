'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/actions/profile'

export default function EditProfileForm({ profile, redirectTo }) {
  const [state, formAction, pending] = useActionState(updateProfile, null)
  const [handle, setHandle] = useState(profile.handle)
  const router = useRouter()
  const redirected = useRef(false)

  // After successful save, redirect if requested (guard prevents double-nav on re-render)
  useEffect(() => {
    if (state?.success && redirectTo && !redirected.current) {
      redirected.current = true
      router.push(redirectTo)
    }
  }, [state?.success, redirectTo, router])

  return (
    <form action={formAction} className="space-y-4">
      {/* Display Name */}
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-warm-700 mb-1">
          Display Name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={profile.display_name}
          required
          minLength={2}
          maxLength={80}
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300"
        />
      </div>

      {/* Handle */}
      <div>
        <label htmlFor="handle" className="block text-sm font-medium text-warm-700 mb-1">
          Handle
        </label>
        <div className="flex items-center gap-1">
          <span className="text-warm-500 text-sm">@</span>
          <input
            id="handle"
            name="handle"
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            minLength={3}
            maxLength={40}
            className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300"
          />
        </div>
        <p className="text-xs text-warm-400 mt-1">
          Your profile URL: /expert/{handle}
        </p>
      </div>

      {/* Headline */}
      <div>
        <label htmlFor="headline" className="block text-sm font-medium text-warm-700 mb-1">
          Headline
        </label>
        <input
          id="headline"
          name="headline"
          type="text"
          defaultValue={profile.headline ?? ''}
          maxLength={120}
          placeholder="VP of Engineering at Acme"
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300"
        />
      </div>

      {/* Organization */}
      <div>
        <label htmlFor="organization" className="block text-sm font-medium text-warm-700 mb-1">
          Organization
        </label>
        <input
          id="organization"
          name="organization"
          type="text"
          defaultValue={profile.organization ?? ''}
          maxLength={100}
          placeholder="Acme Corp"
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300"
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-warm-700 mb-1">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ''}
          rows={3}
          maxLength={500}
          placeholder="Tell others about your expertise..."
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300 resize-y"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
          Profile updated.
        </p>
      )}
    </form>
  )
}
