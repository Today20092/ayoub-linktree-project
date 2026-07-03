import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'Is travel included in the starter prices?',
    answer:
      'Local Tampa-area travel is included. Farther travel, paid parking, venue fees, or unusual load-in requirements are quoted separately before the job is confirmed.',
  },
  {
    question: 'What does the $250 mobile podcast setup include?',
    answer:
      'It includes one local recording hour, one camera, lighting, Shure MV7+ microphones, color grade, EQ, compression, and uploaded video delivery.',
  },
  {
    question: 'What costs extra for podcast or video work?',
    answer:
      'Extra recording time is usually $100-$150/hr. An extra camera is usually $150-$300. Rush delivery is usually $75-$150 depending on the deadline.',
  },
  {
    question: 'Does the $300 photo starter include editing?',
    answer:
      'No. The $300 starter is for short event coverage with fast gallery delivery. Edited selects, portraits, longer coverage, and more polished delivery are quoted separately.',
  },
  {
    question: 'Can guests upload or download event photos?',
    answer:
      'Yes. Event galleries can include guest download links and guest upload links. Face search can also be available for galleries where that feature is enabled.',
  },
  {
    question: 'Can you record a full lecture or khutbah?',
    answer:
      'Yes. I can record a full program and deliver the file. If the event also needs live sound support, that should be planned with the AV setup.',
  },
  {
    question: 'Do you provide all AV equipment?',
    answer:
      'For small events, I can help plan and provide or coordinate the right setup. Larger rooms, multiple microphones, or operator coverage may need a custom quote.',
  },
]

export default function ServicesFaq() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((item, index) => (
        <AccordionItem key={item.question} value={`item-${index}`}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
