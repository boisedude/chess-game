/**
 * A yes-or-no question in the game's own dialog, in place of the browser's
 * native confirm box: a title, one sentence, the action and Cancel.
 */

import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

export interface ConfirmRequest {
  title: string
  body: string
  /** Label of the button that goes ahead. */
  action: string
  destructive?: boolean
  onConfirm: () => void
}

interface ConfirmDialogProps {
  request: ConfirmRequest | null
  onClose: () => void
}

export function ConfirmDialog({ request, onClose }: ConfirmDialogProps) {
  return (
    <Dialog open={request !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent hideClose className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          <DialogDescription>{request?.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={request?.destructive ? 'destructive' : 'default'}
            className="h-11"
            onClick={() => {
              request?.onConfirm()
              onClose()
            }}
          >
            {request?.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
