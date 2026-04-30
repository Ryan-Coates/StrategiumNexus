import { useParams } from 'react-router-dom'
import Wh40kViewer from '../components/Wh40k/Wh40kViewer'
import GenericViewer from './GenericViewer'

export default function RulesViewer() {
  const { slug } = useParams<{ slug: string }>()
  if (slug === 'wh40k') return <Wh40kViewer />
  return <GenericViewer />
}

