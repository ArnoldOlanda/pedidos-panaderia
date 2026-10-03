import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/protected-route';
import { LoginPage } from './pages/login';
import { CatalogPage } from './pages/catalog';
import { ProductDetailPage } from './pages/product-detail';
import { OrdersPage } from './pages/orders';
import { OrderNewPage } from './pages/order-new';
import { VendorProductsPage } from './pages/vendor/products';
import { VendorOrdersPage } from './pages/vendor/orders';
import { VendorRecipesPage } from './pages/vendor/recipes';
import { VendorIngredientsPage } from './pages/vendor/ingredients';
import { NotFoundPage } from './pages/not-found';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/catalog" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'catalog/:id', element: <ProductDetailPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/new', element: <OrderNewPage /> },
      { path: 'vendor/recipes', element: <ProtectedRoute><VendorRecipesPage /></ProtectedRoute> },
      { path: 'vendor/ingredients', element: <ProtectedRoute><VendorIngredientsPage /></ProtectedRoute> },
      { path: 'vendor/products', element: <ProtectedRoute><VendorProductsPage /></ProtectedRoute> },
      { path: 'vendor/orders', element: <ProtectedRoute><VendorOrdersPage /></ProtectedRoute> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);