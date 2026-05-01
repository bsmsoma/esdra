import Layout from "./components/Layout";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard, { dashboardLoader } from "./pages/Dashboard";
import ProductFormAdd, { productFormAddAction } from "./pages/ProductFormAdd";
import ProductFormEdit, { productFormEditLoader, productFormEditAction } from "./pages/ProductFormEdit";
import DashboardOrders from "./pages/DashboardOrders";
import ProductsLayout, { productsLayoutLoader } from "./pages/ProductsLayout";
import ProductsCardsLayout from "./components/ProductsCardsLayout";
import ProductDetails, { productDetailsLoader } from "./pages/ProductDetails";
import Home, { homeLoader } from "./pages/Home";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Login, {
    loginLoader,
    loginAction,
    registerLoader,
    registerAction,
} from "./components/Login";
import AccountLayout, { accountLayoutLoader } from "./pages/AccountLayout";
import AccountDashboard from "./pages/AccountDashboard";
import Profile, { updateProfileAction } from "./pages/Profile";
import OrdersList, { ordersLoader } from "./pages/OrdersList";
import Addresses, { addressesAction } from "./pages/Addresses";
import Cart from "./pages/Cart";
import Checkout, { checkoutLoader, checkoutAction } from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import OrderDetails, { orderDetailsLoader } from "./pages/OrderDetails";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

import {
    Route,
    createBrowserRouter,
    createRoutesFromElements,
} from "react-router";
import { RouterProvider } from "react-router/dom";
import { AuthProvider, requireAdminAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import ErrorBoundary from "./components/ErrorBoundary";
import HydrateFallback from "./components/HydrateFallback";
import "./App.scss";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/toastify.scss";

// Wrapper component to provide context to all routes
function RootLayout() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <CartProvider>
                    <ToastContainer
                        position="bottom-right"
                        autoClose={2500}
                        hideProgressBar={false}
                        closeOnClick
                        pauseOnHover
                        transition={Slide}
                        theme="light"
                    />
                    <Layout />
                </CartProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route
            path="/"
            element={<RootLayout />}
            HydrateFallback={HydrateFallback}
        > {/* Layout is the main layout of the app */}
            <Route index element={<Home />} loader={homeLoader} />
            <Route path="about" element={<About />} />
            <Route path="politica-de-privacidade" element={<PrivacyPolicy />} />
            <Route path="termos-de-uso" element={<TermsOfUse />} />

            {/* ProductsLayout is the layout of the products page */}
            {/* In this routes below we render all the cards of the products */}
            <Route path="products" element={<ProductsLayout />} loader={productsLayoutLoader}> 
                <Route index element={<ProductsCardsLayout />} />
            </Route>

            {/* In this route we render the details of the product */}
            <Route path="products/:id" element={<ProductDetails />} loader={productDetailsLoader} />

            {/* Login is the login page */}
            <Route path="login" element={<Login />} action={loginAction} loader={loginLoader} />
            
            {/* Register is the registration page */}
            <Route
                path="register"
                element={<Login />}
                action={registerAction}
                loader={registerLoader}
            />

            {/* Customer account area */}
            <Route path="account" element={<AccountLayout />} loader={accountLayoutLoader}>
                <Route index element={<AccountDashboard />} />
                <Route path="profile" element={<Profile />} action={updateProfileAction} />
                <Route path="orders" element={<OrdersList />} loader={ordersLoader} />
                <Route path="orders/:orderId" element={<OrderDetails />} loader={orderDetailsLoader} />
                <Route path="addresses" element={<Addresses />} action={addressesAction} />
            </Route>

            {/* Cart */}
            <Route path="cart" element={<Cart />} />
            
            {/* Checkout */}
            <Route path="checkout" element={<Checkout />} loader={checkoutLoader} action={checkoutAction} />
            <Route path="checkout/success" element={<CheckoutSuccess />} />

            {/* If the user is logged in, we render the dashboard */}
            {/* this route is protected by the requireAdminAuth function - only admins can access */}
            <Route path="dashboard" element={<DashboardLayout />} loader={requireAdminAuth}>
                <Route index element={<Dashboard />} loader={dashboardLoader} />
                <Route path="orders" element={<DashboardOrders />} />
                <Route path="add" element={<ProductFormAdd />} action={productFormAddAction} />
                <Route path="edit" element={<ProductFormEdit />} loader={productFormEditLoader} action={productFormEditAction} />
            </Route>
            {/* Renders the not found page */}
            <Route path="*" element={<NotFound />} />
            
        </Route>
    )
);

function App() {
    return <RouterProvider router={router} />;
}


export default App;
