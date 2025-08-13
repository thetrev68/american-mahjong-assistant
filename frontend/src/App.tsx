import { RouterProvider } from 'react-router-dom'
import { AppLayout } from './ui-components/layout/AppLayout'
import { router } from './utils/router'

function App() {
  return (
    <AppLayout>
      <RouterProvider router={router} />
    </AppLayout>
  )
}

export default App
