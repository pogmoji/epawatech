import TrackPage from '@/components/learn/track-page'

type Props = {
  params: Promise<{ track: string; lesson: string }>
}

export default async function LessonPage({ params }: Props) {
  const { track, lesson } = await params
  return <TrackPage trackSlug={track} lessonSlug={lesson} />
}
