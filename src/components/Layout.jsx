import React from "react";
import { Outlet } from "react-router";
import BannerTop from "./BannerTop";
import Header from "./Header";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";

export default function Layout() {

    return (
        <>
            <BannerTop />
            <Header />
            <main>
                <Outlet />
            </main>
            <Footer />
            <CookieConsent />
        </>
    );
}
