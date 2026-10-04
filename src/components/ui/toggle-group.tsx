import * as React from 'react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        default: 'h-9 px-3 min-w-9',
        sm: 'h-8 px-2 min-w-8',
        lg: 'h-11 px-4 min-w-11',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: 'default',
})

function ToggleGroup({
  className,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-md border bg-background p-1',
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({ size: context.size || size }),
        'flex-1',
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
