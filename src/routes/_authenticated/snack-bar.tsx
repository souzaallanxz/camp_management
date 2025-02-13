import { createFileRoute } from '@tanstack/react-router'
import SnackBarPage from './snack-bar/index'

export const Route = createFileRoute('/_authenticated/snack-bar')({
  component: SnackBarPage,
})