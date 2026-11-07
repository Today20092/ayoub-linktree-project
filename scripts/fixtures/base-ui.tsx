import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Button, buttonVariants } from '../../src/components/ui/button'
import { Checkbox } from '../../src/components/ui/checkbox'
import { Label } from '../../src/components/ui/label'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../src/components/ui/accordion'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '../../src/components/ui/dropdown-menu'
import { Progress } from '../../src/components/ui/progress'

function Fixture() {
  const [submitted, setSubmitted] = React.useState(false)
  const [checked, setChecked] = React.useState(false)
  const [pinned, setPinned] = React.useState(false)
  return (
    <main>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
        }}
      >
        <Button>Ordinary command</Button>
        <Button type="submit">Submit fixture</Button>
        <output>{submitted ? 'Submitted' : 'Not submitted'}</output>
      </form>
      <a className={buttonVariants()} href="#destination">
        Native destination
      </a>
      <div>
        <Label htmlFor="fixture-checkbox">Fixture consent</Label>
        <Checkbox
          id="fixture-checkbox"
          checked={checked}
          onCheckedChange={setChecked}
        />
      </div>
      <Accordion>
        <AccordionItem value="first">
          <AccordionTrigger>First answer</AccordionTrigger>
          <AccordionContent>First content</AccordionContent>
        </AccordionItem>
        <AccordionItem value="second">
          <AccordionTrigger>Second answer</AccordionTrigger>
          <AccordionContent>Second content</AccordionContent>
        </AccordionItem>
        <AccordionItem value="disabled" disabled>
          <AccordionTrigger>Disabled answer</AccordionTrigger>
          <AccordionContent>Disabled content</AccordionContent>
        </AccordionItem>
      </Accordion>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button />}>
          Fixture menu
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Fixture actions</DropdownMenuLabel>
            <DropdownMenuItem>Normal action</DropdownMenuItem>
            <DropdownMenuCheckboxItem
              checked={pinned}
              onCheckedChange={setPinned}
            >
              Pin item
            </DropdownMenuCheckboxItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More actions</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuGroup>
                  <DropdownMenuItem>Nested action</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Progress value={37} aria-label="Fixture progress" />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
