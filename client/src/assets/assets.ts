import { TruckIcon, ShieldCheckIcon, MapPinIcon, PhoneIcon, MailIcon, BadgeCheck, Settings2 } from "lucide-react";
import type { ComponentType } from "react";
import { SiFacebook, SiX, SiInstagram } from "@icons-pack/react-simple-icons";
import hero_bg from "./hero_bg.png";
import logo from "./logo.png";
import delivery_truck from "./delivery_truck.svg";

import {
  EngineAnim,
  BrakeAnim,
  SuspensionAnim,
  WheelAnim,
   ElectricalAnim,
  MaintenanceAnim,
} from '../components/Home/SlideAnimations'

import heroMainimg from './heroMainimg.png'
import BrakesCarousel from './BrakesCarousel.png';
import EnginePartsCarousel from "./EnginePartsCarousel.jpg";
import SuspensionCarousel from "./SuspensionCarousel.png";
import TyreCarousel from './Tyrecarousel.png';
import AmaronBrand from "./01-amaron.jpg";
import BoschBrand from "./02-bosch.jpg";
import NGKBrand from "./03-ngk.jpg";
import ExideBrand from "./04-exide.jpg";
import CastrolBrand from "./05-castrol.jpg";
import MotulBrand from "./06-motul.jpg";
import MichelinBrand from "./07-michelin.jpg";
import RoyalEnfieldBrand from "./08-royal-enfield.jpg";
import TVSGirlingBrand from "./09-tvs-girling.jpg";
import HeroGenuinePartsBrand from "./10-hero-genuine-parts.jpg";
import OSRAMBrand from "./11-osram.jpg";
import NIKAVIBrand from "./12-nikavi.jpg";
import BrakePadsImg from "./01-brake-pads.png";
import SparkPlugImg from "./02-spark-plug.png";
import CarBatteryImg from "./03-car-battery.png";
import EngineGasketKitImg from "./04-engine-gasket-kit.png";
import DiscBrakePadsImg from "./05-disc-brake-pads.png";
import MotorcycleBatteryImg from "./06-motorcycle-battery.png";
import AirFilterImg from "./07-air-filter.png";
import BrakeShoesImg from "./08-brake-shoes.png";
import CompactBikeBatteryImg from "./09-compact-bike-battery.png";
import EngineGasketSetImg from "./10-engine-gasket-set.png";

export const assets = {
    delivery_truck,
    hero_bg,
};


export const BrandsData = [
  {
    slug: "nikavi",
    name: "NIKAVI",
    image: NIKAVIBrand,
  },
  {
    slug: "ngk",
    name: "NGK",
    image: NGKBrand,
  },
  {
    slug: "amaron",
    name: "Amaron",
    image: AmaronBrand,
  },
  {
    slug: "royal-enfield",
    name: "Royal Enfield",
    image: RoyalEnfieldBrand,
  },
  {
    slug: "tvs-girling",
    name: "TVS Girling",
    image: TVSGirlingBrand,
  },
  {
    slug: "exide",
    name: "Exide",
    image: ExideBrand,
  },
  {
    slug: "hero-genuine-parts",
    name: "Hero Genuine Parts",
    image: HeroGenuinePartsBrand,
  },
  {
    slug: "bosch",
    name: "Bosch",
    image: BoschBrand,
  },
  {
    slug: "castrol",
    name: "Castrol",
    image: CastrolBrand,
  },
  {
    slug: "motul",
    name: "MOTUL",
    image: MotulBrand,
  },
  {
    slug: "osram",
    name: "OSRAM",
    image: OSRAMBrand,
  },
  {
    slug: "michelin",
    name: "Michelin",
    image: MichelinBrand,
  },
];

export const categories: { id: string; title: string; description: string; animation: ComponentType; accent: string; image?: string }[] = [
  {
    id: "engine",
    title: "Engine & Engine Parts",
    description:
      "Pistons, cylinder heads, crankshafts, gaskets, timing chains and filters.",
    animation: EngineAnim,
    accent: "amber",
  },
  {
    id: "brakes",
    title: "Braking & Transmission",
    description:
      "Brake pads, discs, calipers, clutch plates, gearboxes and sprockets.",
    animation: BrakeAnim,
    accent: "red",
  },
  {
  id: "electrical",
  title: "Electrical & Ignition",
  description:
    "Batteries, spark plugs, ignition coils, sensors, wiring and lighting.",
  animation: ElectricalAnim,
  accent: "amber",
},
  {
    id: "suspension",
    title: "Suspension & Steering",
    description:
      "Shock absorbers, forks, control arms, bearings and steering components.",
    animation: SuspensionAnim,
    accent: "red",
  },
  {
    id: "wheels",
    title: "Wheels, Tyres & Body Parts",
    description:
      "Tyres, alloy wheels, mirrors, headlights, bumpers and body panels.",
    animation: WheelAnim,
    accent: "amber",
  },
  {
  id: "performance",
  title: "Performance & Maintenance",
  description:
    "Engine oils, coolants, exhausts, performance filters and service kits.",
  animation: MaintenanceAnim,
  accent: "red",
},
];

export const heroSectionData = {
    description: "Find premium-quality spare parts and accessories for cars and motorcycles, all in one place. From essential replacements to performance upgrades, get the right parts to keep your ride running smoothly.",
    hero_image: hero_bg,
    logo:logo,
    heroMainimg: heroMainimg,
    hero_features: [
        { icon: BadgeCheck, title: "Quality Assured", desc: "Built for Lasting Performance" },
        { icon: Settings2, title: "Vehicle Compatiblity", desc: "Parts that fit your ride" },
        { icon: TruckIcon, title: "Quick Dispatch", desc: "Get back on the road sooner" },
        { icon: ShieldCheckIcon, title: "Secure Pay", desc: "Safe and easy checkout" },
    ],
};

export const deliveryPartnerLoginImage = "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200";

export const appPromoBannerData = {
    title: "Get fresh groceries in minutes",
    description: "Download the Instacart app for exclusive deals, real-time tracking, and the freshest selection delivered right to your door.",
};

export const footerData = {
    brand: {
        name: "TorqueNest",
        description: "Bringing fresh, organic groceries straight from local farms to your doorstep. Nourish your home with Earth's finest.",
        socials: [
            { icon: SiFacebook, link: "#" },
            { icon: SiX, link: "#" },
            { icon: SiInstagram, link: "#" },
        ],
    },

    sections: [
        {
            title: "Quick Links",
            links: [
                { label: "All Products", to: "/products" },
                { label: "Flash Deals", to: "/deals" },
                { label: "Track Order", to: "/orders" },
                { label: "Delivery Partner", to: "/delivery" },
            ],
        },
        {
            title: "Customer Service",
            links: [
                { label: "My Account", to: "#" },
                { label: "Order History", to: "#" },
                { label: "Addresses", to: "#" },
                { label: "Help Center", href: "#" },
            ],
        },
    ],

    contact: [
        { icon: MapPinIcon, text: "123 Green Valley Rd, Portland" },
        { icon: PhoneIcon, text: "+1 (111) 123-4567" },
        { icon: MailIcon, text: "hello@example.com" },
    ],

    bottom: {
        copyright: "© 2026 Greatstack. All rights reserved.",
        links: [
            { label: "Privacy Policy", href: "#" },
            { label: "Terms of Service", href: "#" },
        ],
    },
};

export const statusColors: Record<string, string> = {
    Placed: "bg-blue-100 text-blue-700",
    Confirmed: "bg-indigo-100 text-indigo-700",
    Packed: "bg-purple-100 text-purple-700",
    "Out for Delivery": "bg-app-orange/10 text-app-orange",
    Delivered: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
};

export const iconsForLeafpad = {
    truck: "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
    destination: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
};





export const dummyProducts = [
  // 1. BRAKES — NIKAVI
  {
    _id: "auto001",
    id: "auto001",
    name: "NIKAVI Rear Disc Brake Pads",
    description:
      "Rear disc brake pads compatible with Yamaha Fazer 25, FZ25 and YZF-R15 V3",
    brand: "NIKAVI",
    price: 160,
    originalPrice: 200,
    image: BrakePadsImg,
    category: "brakes",
    unit: "1 set",
    stock: 25,
    iGenuine: false,
    rating: 4.5,
    reviewCount: 128,
    discount: 20,
    compatibleVehicles: [
      "Yamaha Fazer 25",
      "Yamaha FZ25",
      "Yamaha YZF-R15 V3",
    ],
    partNumber: "DP25",
  },

  // 2. ELECTRICAL — NGK
  {
    _id: "auto002",
    id: "auto002",
    name: "NGK Iridium Spark Plug",
    description: "Iridium spark plug for KTM Duke 390 Gen 3",
    brand: "NGK",
    price: 515,
    originalPrice: 590,
    image: SparkPlugImg,
    category: "electrical",
    unit: "1 pc",
    stock: 20,
    iGenuine: false,
    rating: 4.6,
    reviewCount: 210,
    discount: 13,
    compatibleVehicles: ["KTM Duke 390 Gen 3"],
    partNumber: "LKAR8AI-9",
  },

  // 3. ELECTRICAL — Amaron
  {
    _id: "auto003",
    id: "auto003",
    name: "Amaron GO Car Battery",
    description:
      "Automotive starter battery; verify dimensions and terminal layout",
    brand: "Amaron",
    price: 3064,
    originalPrice: 3499,
    image: CarBatteryImg,
    category: "electrical",
    unit: "1 battery",
    stock: 10,
    iGenuine: false,
    rating: 4.5,
    reviewCount: 76,
    discount: 12,
    compatibleVehicles: [],
    partNumber: "AAM-GO-00038B20L",
  },

  // 4. ENGINE — Royal Enfield
  {
    _id: "auto004",
    id: "auto004",
    name: "Royal Enfield UCE Engine Gasket Kit",
    description:
      "Engine gasket kit for compatible Royal Enfield UCE applications",
    brand: "Royal Enfield",
    price: 575,
    originalPrice: 650,
    image: EngineGasketKitImg,
    category: "engine",
    unit: "1 kit",
    stock: 15,
    iGenuine: false,
    rating: 4.4,
    reviewCount: 64,
    discount: 12,
    compatibleVehicles: [
      "Royal Enfield Classic 350 UCE",
      "Royal Enfield Bullet 350 UCE",
    ],
    partNumber: "888354",
  },

  // 5. BRAKES — TVS Girling
  {
    _id: "auto005",
    id: "auto005",
    name: "TVS Girling Front Brake Pads",
    description:
      "Front brake pad set for compatible Hyundai Creta, Alcazar and Kia Seltos variants",
    brand: "TVS Girling",
    price: 1673,
    originalPrice: 1999,
    image: DiscBrakePadsImg,
    category: "brakes",
    unit: "1 set",
    stock: 12,
    iGenuine: false,
    rating: 4.4,
    reviewCount: 96,
    discount: 16,
    compatibleVehicles: [
      "Hyundai Creta",
      "Hyundai Alcazar",
      "Kia Seltos",
    ],
    partNumber: "358.172-211",
  },

  // 6. ELECTRICAL — Exide
  {
    _id: "auto006",
    id: "auto006",
    name: "Exide Xplore Bike Battery",
    description:
      "Motorcycle battery; confirm battery code against the original unit",
    brand: "Exide",
    price: 1300,
    originalPrice: 1499,
    image: MotorcycleBatteryImg,
    category: "electrical",
    unit: "1 battery",
    stock: 15,
    iGenuine: false,
    rating: 4.5,
    reviewCount: 89,
    discount: 13,
    compatibleVehicles: [],
    partNumber: "XLTZ5A",
  },

  // 7. PERFORMANCE — NIKAVI
  {
    _id: "auto007",
    id: "auto007",
    name: "NIKAVI Motorcycle Air Filter",
    description:
      "Replacement air filter compatible with selected Aprilia scooters",
    brand: "NIKAVI",
    price: 142,
    originalPrice: 180,
    image: AirFilterImg,
    category: "performance",
    unit: "1 pc",
    stock: 20,
    iGenuine: false,
    rating: 4.3,
    reviewCount: 142,
    discount: 21,
    compatibleVehicles: [
      "Aprilia SR 150",
      "Aprilia SR 160",
      "Aprilia Storm 125",
    ],
    partNumber: "NAFF083",
  },

  // 8. BRAKES — Hero Genuine Parts
  {
    _id: "auto008",
    id: "auto008",
    name: "Hero Genuine Brake Shoe",
    description:
      "Genuine replacement brake shoe for compatible Hero commuter bikes",
    brand: "Hero Genuine Parts",
    price: 90,
    originalPrice: 120,
    image: BrakeShoesImg,
    category: "brakes",
    unit: "1 pc",
    stock: 30,
    iGenuine: false,
    rating: 4.5,
    reviewCount: 112,
    discount: 25,
    compatibleVehicles: [
      "Hero Splendor Plus",
      "Hero HF Deluxe",
      "Hero HF Dawn",
    ],
    partNumber: null,
  },

  // 9. ELECTRICAL — Bosch
  {
    _id: "auto009",
    id: "auto009",
    name: "Bosch M6 Motorcycle Battery",
    description:
      "12V motorcycle starter battery; verify exact vehicle fitment",
    brand: "Bosch",
    price: 1123,
    originalPrice: 1299,
    image: CompactBikeBatteryImg,
    category: "electrical",
    unit: "1 battery",
    stock: 10,
    iGenuine: false,
    rating: 4.4,
    reviewCount: 54,
    discount: 14,
    compatibleVehicles: [],
    partNumber: "F002H50063",
  },

  // 10. ENGINE — Royal Enfield
  {
    _id: "auto010",
    id: "auto010",
    name: "Royal Enfield Engine Gasket Set",
    description:
      "Gasket set for compatible Royal Enfield Bullet and Electra cast-iron engines",
    brand: "Royal Enfield",
    price: 345,
    originalPrice: 399,
    image: EngineGasketSetImg,
    category: "engine",
    unit: "1 set",
    stock: 15,
    iGenuine: false,
    rating: 4.5,
    reviewCount: 73,
    discount: 14,
    compatibleVehicles: [
      "Royal Enfield Bullet CI",
      "Royal Enfield Electra CI",
    ],
    partNumber: "144040",
  },

  // 11. PERFORMANCE — Castrol
  {
    _id: "auto011",
    id: "auto011",
    name: "Castrol Engine Oil",
    description:
      "Engine oil; choose the viscosity and specification recommended for your vehicle",
    brand: "Castrol",
    price: 650,
    originalPrice: 750,
    image: EnginePartsCarousel,
    category: "performance",
    unit: "1 litre",
    stock: 20,
    iGenuine: false,
    rating: 4.6,
    reviewCount: 85,
    discount: 13,
    compatibleVehicles: [],
    partNumber: "CASTROL-1L",
  },

  // 12. PERFORMANCE — MOTUL
  {
    _id: "auto012",
    id: "auto012",
    name: "MOTUL Motorcycle Engine Oil",
    description:
      "Motorcycle engine oil; check the recommended viscosity and specification",
    brand: "MOTUL",
    price: 850,
    originalPrice: 999,
    image: EnginePartsCarousel,
    category: "performance",
    unit: "1 litre",
    stock: 15,
    iGenuine: false,
    rating: 4.7,
    reviewCount: 92,
    discount: 15,
    compatibleVehicles: [],
    partNumber: "MOTUL-1L",
  },

  // 13. ELECTRICAL — OSRAM
  {
    _id: "auto013",
    id: "auto013",
    name: "OSRAM Automotive Bulb",
    description:
      "Automotive replacement bulb; confirm bulb type and vehicle compatibility",
    brand: "OSRAM",
    price: 450,
    originalPrice: 550,
    image: SparkPlugImg,
    category: "electrical",
    unit: "1 pc",
    stock: 18,
    iGenuine: false,
    rating: 4.4,
    reviewCount: 45,
    discount: 18,
    compatibleVehicles: [],
    partNumber: "OSRAM-AUTO",
  },

  // 14. WHEELS — Michelin
  {
    _id: "auto014",
    id: "auto014",
    name: "Michelin Replacement Tyre",
    description:
      "Replacement tyre; select the correct size, load rating and vehicle fitment",
    brand: "Michelin",
    price: 3200,
    originalPrice: 3800,
    image: TyreCarousel,
    category: "wheels",
    unit: "1 tyre",
    stock: 8,
    iGenuine: false,
    rating: 4.7,
    reviewCount: 68,
    discount: 16,
    compatibleVehicles: [],
    partNumber: "MICHELIN-TYRE",
  },

  // 15. SUSPENSION — TVS Girling
  {
    _id: "auto015",
    id: "auto015",
    name: "TVS Girling Suspension Component",
    description:
      "Suspension replacement component; verify dimensions and vehicle compatibility",
    brand: "TVS Girling",
    price: 1800,
    originalPrice: 2200,
    image: SuspensionCarousel,
    category: "suspension",
    unit: "1 pc",
    stock: 10,
    iGenuine: false,
    rating: 4.4,
    reviewCount: 32,
    discount: 18,
    compatibleVehicles: [],
    partNumber: "TVS-SUSP-01",
  },
];


export const dummyAdminDashboardData = {
    totalOrders: 1,
    totalUsers: 3,
    totalProducts: 27,
    outOfStock: 0,
    totalPartners: 2,
    recentOrders: [
        {
            shippingAddress: {
                label: "Home",
                address: "New Market Road ",
                city: "New York ",
                state: "NY",
                zip: "876543",
                lat: 40.7128,
                lng: -74.006,
            },
            liveLocation: {
                lat: 40.7128,
                lng: -74.006,
                updatedAt: "2026-04-06T08:41:27.211Z",
            },
            _id: "69d366617ed7e54198d67dac",
            user: {
                _id: "69bb6caf448f2d818db59122",
                name: "Admin",
                email: "admin@example.com",
            },
            items: [
                {
                    product: "69c22613ae75a98c7cd13b3b",
                    name: "Butter Croissant 100g",
                    image: "https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/zvoeqbvrbrt7atqj0dbu.png",
                    price: 45,
                    quantity: 2,
                    unit: "100g",
                    _id: "69d366617ed7e54198d67dad",
                },
                {
                    product: "69c22613ae75a98c7cd13b36",
                    name: "Barley 1kg",
                    image: "https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/spb5sgy8g24rned9nwog.png",
                    price: 140,
                    quantity: 1,
                    unit: "1kg",
                    _id: "69d366617ed7e54198d67dae",
                },
            ],
            paymentMethod: "cash",
            subtotal: 230,
            deliveryFee: 0,
            tax: 18.4,
            total: 248.4,
            status: "Delivered",
            statusHistory: [
                {
                    status: "Placed",
                    note: "Order placed successfully",
                    _id: "69d366617ed7e54198d67daf",
                    timestamp: "2026-04-06T07:53:05.769Z",
                },
                {
                    status: "Assigned",
                    note: "Assigned to Rahul",
                    _id: "69d366ab7ed7e54198d67dbe",
                    timestamp: "2026-04-06T07:54:19.796Z",
                },
                {
                    status: "Packed",
                    note: "Status updated to Packed",
                    _id: "69d366b37ed7e54198d67ddc",
                    timestamp: "2026-04-06T07:54:27.171Z",
                },
                {
                    status: "Out for Delivery",
                    note: "Status updated to Out for Delivery",
                    _id: "69d366b57ed7e54198d67e00",
                    timestamp: "2026-04-06T07:54:29.226Z",
                },
                {
                    status: "Delivered",
                    note: "Delivered by partner",
                    _id: "69d373207ed7e54198d681b1",
                    timestamp: "2026-04-06T08:47:28.983Z",
                },
            ],
            deliveryPartner: {
                _id: "69bbfc3866db7c6cdea47ede",
                name: "Rahul",
                phone: "987654321",
            },
            deliveryOtp: "",
            isPaid: false,
            createdAt: "2026-04-06T07:53:05.774Z",
            updatedAt: "2026-04-06T08:47:28.984Z",
            __v: 4,
        },
    ],
};

export const dummyDeliveryPartnerData = [
    {
        _id: "69bbfc6c66db7c6cdea47ee4",
        name: "John Doe",
        email: "johndoe@example.com",
        phone: "987654321",
        avatar: "",
        vehicleType: "bike",
        isActive: true,
        createdAt: "2026-03-19T13:38:52.827Z",
        updatedAt: "2026-03-19T13:38:52.827Z",
        __v: 0,
    },
    {
        _id: "69bbfc3866db7c6cdea47ede",
        name: "Rahul",
        email: "rahul@example.com",
        phone: "987654321",
        avatar: "",
        vehicleType: "bike",
        isActive: true,
        createdAt: "2026-03-19T13:38:00.872Z",
        updatedAt: "2026-03-19T13:38:00.872Z",
        __v: 0,
    },
];

export const dummyDashboardOrdersData = [
    {
        shippingAddress: {
            label: "Home",
            address: "New Market Road ",
            city: "New York ",
            state: "NY",
            zip: "876543",
            lat: 40.7128,
            lng: -74.006,
        },
        liveLocation: {
            lat: 40.7128,
            lng: -74.006,
            updatedAt: "2026-04-06T08:41:27.211Z",
        },
        _id: "69d366617ed7e54198d67dac",
        user: {
            _id: "69bb6caf448f2d818db59122",
            name: "Admin",
            email: "admin@example.com",
        },
        items: [
            {
                product: "69c22613ae75a98c7cd13b3b",
                name: "Butter Croissant 100g",
                image: "https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/zvoeqbvrbrt7atqj0dbu.png",
                price: 45,
                quantity: 2,
                unit: "100g",
                _id: "69d366617ed7e54198d67dad",
            },
            {
                product: "69c22613ae75a98c7cd13b36",
                name: "Barley 1kg",
                image: "https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/spb5sgy8g24rned9nwog.png",
                price: 140,
                quantity: 1,
                unit: "1kg",
                _id: "69d366617ed7e54198d67dae",
            },
        ],
        paymentMethod: "cash",
        subtotal: 230,
        deliveryFee: 0,
        tax: 18.4,
        total: 248.4,
        status: "Delivered",
        statusHistory: [
            { status: "Placed", note: "Order placed successfully", _id: "69d366617ed7e54198d67daf", timestamp: "2026-04-06T07:53:05.769Z" },
            { status: "Assigned", note: "Assigned to Rahul", _id: "69d366ab7ed7e54198d67dbe", timestamp: "2026-04-06T07:54:19.796Z" },
            { status: "Packed", note: "Status updated to Packed", _id: "69d366b37ed7e54198d67ddc", timestamp: "2026-04-06T07:54:27.171Z" },
            { status: "Out for Delivery", note: "Status updated to Out for Delivery", _id: "69d366b57ed7e54198d67e00", timestamp: "2026-04-06T07:54:29.226Z" },
            { status: "Delivered", note: "Delivered by partner", _id: "69d373207ed7e54198d681b1", timestamp: "2026-04-06T08:47:28.983Z" },
        ],
        deliveryPartner: { _id: "69bbfc3866db7c6cdea47ede", name: "Rahul", email: "rahul@example.com", phone: "987654321" },
        deliveryOtp: "",
        isPaid: false,
        createdAt: "2026-04-06T07:53:05.774Z",
        updatedAt: "2026-04-06T08:47:28.984Z",
        __v: 4,
    },
    {
        shippingAddress: { label: "Home", address: "New Market Road ", city: "New York ", state: "NY", zip: "876543", lat: 40.7128, lng: -74.006 },
        liveLocation: { lat: 40.7128, lng: -74.006, updatedAt: "2026-04-06T08:41:27.211Z" },
        _id: "69d366617ed7e54198d67dad",
        user: { _id: "69bb6caf448f2d818db59122", name: "Admin", email: "admin@example.com" },
        items: [
            { product: "69c22613ae75a98c7cd13b3b", name: "Butter Croissant 100g", image: "https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/zvoeqbvrbrt7atqj0dbu.png", price: 45, quantity: 2, unit: "100g", _id: "69d366617ed7e54198d67dad" },
            { product: "69c22613ae75a98c7cd13b36", name: "Barley 1kg", image: "https://raw.githubusercontent.com/avinashdm/gs-images/main/greencart/spb5sgy8g24rned9nwog.png", price: 140, quantity: 1, unit: "1kg", _id: "69d366617ed7e54198d67dae" },
        ],
        paymentMethod: "cash",
        subtotal: 230,
        deliveryFee: 0,
        tax: 18.4,
        total: 248.4,
        status: "Out for Delivery",
        statusHistory: [
            { status: "Placed", note: "Order placed successfully", _id: "69d366617ed7e54198d67daf", timestamp: "2026-04-06T07:53:05.769Z" },
            { status: "Assigned", note: "Assigned to Rahul", _id: "69d366ab7ed7e54198d67dbe", timestamp: "2026-04-06T07:54:19.796Z" },
            { status: "Packed", note: "Status updated to Packed", _id: "69d366b37ed7e54198d67ddc", timestamp: "2026-04-06T07:54:27.171Z" },
            { status: "Out for Delivery", note: "Status updated to Out for Delivery", _id: "69d366b57ed7e54198d67e00", timestamp: "2026-04-06T07:54:29.226Z" },
        ],
        deliveryPartner: { _id: "69bbfc3866db7c6cdea47ede", name: "Rahul", email: "rahul@example.com", phone: "987654321" },
        deliveryOtp: "754730",
        isPaid: false,
        createdAt: "2026-04-06T07:53:05.774Z",
        updatedAt: "2026-04-06T08:47:28.984Z",
        __v: 4,
    },
];

export const dummyCartData = [
    { product: dummyProducts[0], quantity: 1 },
    { product: dummyProducts[1], quantity: 1 },
    { product: dummyProducts[2], quantity: 1 },
];

export const dummyAddressData = [
    { label: "Home", address: "123 Main St ", city: "New York ", state: "NY", zip: "10001", isDefault: true, lat: 40.7128, lng: -74.006, _id: "69d3652df9a340288f1a0f8c" },
    { label: "Work", address: "456 Market St ", city: "New York ", state: "NY", zip: "10002", isDefault: false, lat: 40.7128, lng: -74.006, _id: "69d3652df9a340288f1a0f8d" },
];


export const carouselSlides = [
  {
    tag: "New Arrivals",
    headline: "Brake Systems Built to Stop",
    sub: "OEM-grade rotors, pads & calipers for every make and model. Same-day dispatch on all in-stock items.",
    cta: "Shop Brakes",
    to: "/products",
    accent: "#F0A52B",
    BgImg: BrakesCarousel,
    bg: "linear-gradient(to right, rgba(26,26,26,0.85) 15%, rgba(26,26,26,0.15) 50%, rgba(26,26,26,0.8) 100%)",
    icon: "M80 40 A40 40 0 1 1 79.99 40 Z M80 60 A20 20 0 1 1 79.99 60 Z",
  },
  {
    tag: "Top Rated",
    headline: "Engine Parts That Deliver",
    sub: "Pistons, gaskets, timing kits and more. Sourced from verified manufacturers — every part certified.",
    cta: "Explore Engine",
    to: "/products",
    accent: "#F0A52B",
    BgImg: EnginePartsCarousel,
    bg: "linear-gradient(to right, rgba(16,24,32,1) 15%, rgba(16,24,32,0.12) 50%, rgba(16,24,32,1) 95%)",
    icon: "M60 30 L100 30 L110 50 L100 70 L60 70 L50 50 Z",
  },
  {
    tag: "Flash Deal",
    headline: "Up to 30% Off Suspension",
    sub: "Coilovers, struts, control arms. Handle every road with confidence — limited stock at these prices.",
    cta: "Grab the Deal",
    to: "/deals",
    accent: "#F0A52B",
    BgImg: SuspensionCarousel,
    bg: "linear-gradient(to right, rgba(26,18,8,1) 15%, rgba(26,18,8,0.12) 50%, rgba(26,18,8,1) 95%)",
    icon: "M70 20 Q80 50 70 80 M90 20 Q100 50 90 80",
  },
  {
    tag: "Free Shipping",
    headline: "Wheels & Tyres, Delivered",
    sub: "Free delivery on orders over ₹10,000. Choose from 500+ rim styles and tyre brands.",
    cta: "Browse Wheels",
    to: "/products",
    accent: "#F0A52B",
    BgImg: TyreCarousel,
    bg: "linear-gradient(to right, rgba(16,32,43,1) 15%, rgba(16,32,43,0.12) 50%, rgba(16,32,43,1) 95%)",
    icon: "M80 40 A40 40 0 1 1 79.99 40 Z M80 55 A15 15 0 1 1 79.99 55 Z",
  },
];
