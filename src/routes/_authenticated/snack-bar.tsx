import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const SnackBarPage = lazy(() => import('./snack-bar/index.lazy'))

export const Route = createFileRoute('/_authenticated/snack-bar')({
  component: SnackBarPage,
}) 