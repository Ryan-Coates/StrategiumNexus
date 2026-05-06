import { useParams } from 'react-router-dom'
import Wh40kViewer from '../components/Wh40k/Wh40kViewer'
import HHViewer from '../components/HH/HHViewer'
import GenericViewer from './GenericViewer'

export default function RulesViewer() {
  const { slug } = useParams<{ slug: string }>()
  if (slug === 'wh40k') return <Wh40kViewer />
  if (slug === 'horus-heresy') return <HHViewer />
  return <GenericViewer />
}

