import { prisma } from "./config/prisma.js"
import { Prisma } from "./generated/prisma/client.js"

const clientOrigin = (process.env.CLIENT_URL ?? "http://localhost:5173").replace(/\/$/, "");
const productImage = (fileName: string) => `${clientOrigin}/images/products/${fileName}`;


const seedDB= async()=>{
  try{
    await prisma.product.deleteMany({})
    console.log("cleared existing products")
    const products:Prisma.ProductCreateManyInput[]= [
      // 1. BRAKES — NIKAVI
      {
        
        name: "NIKAVI Rear Disc Brake Pads",
        description:
          "Rear disc brake pads compatible with Yamaha Fazer 25, FZ25 and YZF-R15 V3",
        brand: "NIKAVI",
        price: 160,
        originalPrice: 200,
        image: productImage("01-brake-pads.png"),
        category: "brakes",
        unit: "1 set",
        stock: 25,
        iGenuine: false,
        rating: 4.5,
        reviewCount: 128,
        compatibleVehicles: [
          "Yamaha Fazer 25",
          "Yamaha FZ25",
          "Yamaha YZF-R15 V3",
        ],
        partNumber: "DP25",
      },
    
      // 2. ELECTRICAL — NGK
      {
       
        name: "NGK Iridium Spark Plug",
        description: "Iridium spark plug for KTM Duke 390 Gen 3",
        brand: "NGK",
        price: 515,
        originalPrice: 590,
        image: productImage("02-spark-plug.png"),
        category: "electrical",
        unit: "1 pc",
        stock: 20,
        iGenuine: false,
        rating: 4.6,
        reviewCount: 210,
        compatibleVehicles: ["KTM Duke 390 Gen 3"],
        partNumber: "LKAR8AI-9",
      },
    
      // 3. ELECTRICAL — Amaron
      {
      
        name: "Amaron GO Car Battery",
        description:
          "Automotive starter battery; verify dimensions and terminal layout",
        brand: "Amaron",
        price: 3064,
        originalPrice: 3499,
        image: productImage("03-car-battery.png"),
        category: "electrical",
        unit: "1 battery",
        stock: 10,
        iGenuine: false,
        rating: 4.5,
        reviewCount: 76,
        compatibleVehicles: [],
        partNumber: "AAM-GO-00038B20L",
      },
    
      // 4. ENGINE — Royal Enfield
      {
       
        name: "Royal Enfield UCE Engine Gasket Kit",
        description:
          "Engine gasket kit for compatible Royal Enfield UCE applications",
        brand: "Royal Enfield",
        price: 575,
        originalPrice: 650,
        image: productImage("04-engine-gasket-kit.png"),
        category: "engine",
        unit: "1 kit",
        stock: 15,
        iGenuine: false,
        rating: 4.4,
        reviewCount: 64,
        compatibleVehicles: [
          "Royal Enfield Classic 350 UCE",
          "Royal Enfield Bullet 350 UCE",
        ],
        partNumber: "888354",
      },
    
      // 5. BRAKES — TVS Girling
      {
       
        name: "TVS Girling Front Brake Pads",
        description:
          "Front brake pad set for compatible Hyundai Creta, Alcazar and Kia Seltos variants",
        brand: "TVS Girling",
        price: 1673,
        originalPrice: 1999,
        image: productImage("05-disc-brake-pads.png"),
        category: "brakes",
        unit: "1 set",
        stock: 12,
        iGenuine: false,
        rating: 4.4,
        reviewCount: 96,
        compatibleVehicles: [
          "Hyundai Creta",
          "Hyundai Alcazar",
          "Kia Seltos",
        ],
        partNumber: "358.172-211",
      },
    
      // 6. ELECTRICAL — Exide
      {
     
        name: "Exide Xplore Bike Battery",
        description:
          "Motorcycle battery; confirm battery code against the original unit",
        brand: "Exide",
        price: 1300,
        originalPrice: 1499,
        image: productImage("06-motorcycle-battery.png"),
        category: "electrical",
        unit: "1 battery",
        stock: 15,
        iGenuine: false,
        rating: 4.5,
        reviewCount: 89,
        compatibleVehicles: [],
        partNumber: "XLTZ5A",
      },
    
      // 7. PERFORMANCE — NIKAVI
      {
       
        name: "NIKAVI Motorcycle Air Filter",
        description:
          "Replacement air filter compatible with selected Aprilia scooters",
        brand: "NIKAVI",
        price: 142,
        originalPrice: 180,
        image: productImage("07-air-filter.png"),
        category: "performance",
        unit: "1 pc",
        stock: 20,
        iGenuine: false,
        rating: 4.3,
        reviewCount: 142,
        compatibleVehicles: [
          "Aprilia SR 150",
          "Aprilia SR 160",
          "Aprilia Storm 125",
        ],
        partNumber: "NAFF083",
      },
    
      // 8. BRAKES — Hero Genuine Parts
      {
       
        name: "Hero Genuine Brake Shoe",
        description:
          "Genuine replacement brake shoe for compatible Hero commuter bikes",
        brand: "Hero Genuine Parts",
        price: 90,
        originalPrice: 120,
        image: productImage("08-brake-shoes.png"),
        category: "brakes",
        unit: "1 pc",
        stock: 30,
        iGenuine: false,
        rating: 4.5,
        reviewCount: 112,
        compatibleVehicles: [
          "Hero Splendor Plus",
          "Hero HF Deluxe",
          "Hero HF Dawn",
        ],
        partNumber: null,
      },
    
      // 9. ELECTRICAL — Bosch
      {
      
        name: "Bosch M6 Motorcycle Battery",
        description:
          "12V motorcycle starter battery; verify exact vehicle fitment",
        brand: "Bosch",
        price: 1123,
        originalPrice: 1299,
        image: productImage("09-compact-bike-battery.png"),
        category: "electrical",
        unit: "1 battery",
        stock: 10,
        iGenuine: false,
        rating: 4.4,
        reviewCount: 54,
        compatibleVehicles: [],
        partNumber: "F002H50063",
      },
    
      // 10. ENGINE — Royal Enfield
      {
       
        name: "Royal Enfield Engine Gasket Set",
        description:
          "Gasket set for compatible Royal Enfield Bullet and Electra cast-iron engines",
        brand: "Royal Enfield",
        price: 345,
        originalPrice: 399,
        image: productImage("10-engine-gasket-set.png"),
        category: "engine",
        unit: "1 set",
        stock: 15,
        iGenuine: false,
        rating: 4.5,
        reviewCount: 73,
        compatibleVehicles: [
          "Royal Enfield Bullet CI",
          "Royal Enfield Electra CI",
        ],
        partNumber: "144040",
      },
    
      // 11. PERFORMANCE — Castrol
      {
       
        name: "Castrol Engine Oil",
        description:
          "Engine oil; choose the viscosity and specification recommended for your vehicle",
        brand: "Castrol",
        price: 650,
        originalPrice: 750,
        image: productImage("EnginePartsCarousel.jpg"),
        category: "performance",
        unit: "1 litre",
        stock: 20,
        iGenuine: false,
        rating: 4.6,
        reviewCount: 85,
        compatibleVehicles: [],
        partNumber: "CASTROL-1L",
      },
    
      // 12. PERFORMANCE — MOTUL
      {
        
        name: "MOTUL Motorcycle Engine Oil",
        description:
          "Motorcycle engine oil; check the recommended viscosity and specification",
        brand: "MOTUL",
        price: 850,
        originalPrice: 999,
        image: productImage("EnginePartsCarousel.jpg"),
        category: "performance",
        unit: "1 litre",
        stock: 15,
        iGenuine: false,
        rating: 4.7,
        reviewCount: 92,
        compatibleVehicles: [],
        partNumber: "MOTUL-1L",
      },
    
      // 13. ELECTRICAL — OSRAM
      {
       
        name: "OSRAM Automotive Bulb",
        description:
          "Automotive replacement bulb; confirm bulb type and vehicle compatibility",
        brand: "OSRAM",
        price: 450,
        originalPrice: 550,
        image: productImage("02-spark-plug.png"),
        category: "electrical",
        unit: "1 pc",
        stock: 18,
        iGenuine: false,
        rating: 4.4,
        reviewCount: 45,
        compatibleVehicles: [],
        partNumber: "OSRAM-AUTO",
      },
    
      // 14. WHEELS — Michelin
      {
        
        name: "Michelin Replacement Tyre",
        description:
          "Replacement tyre; select the correct size, load rating and vehicle fitment",
        brand: "Michelin",
        price: 3200,
        originalPrice: 3800,
        image: productImage("Tyrecarousel.png"),
        category: "wheels",
        unit: "1 tyre",
        stock: 8,
        iGenuine: false,
        rating: 4.7,
        reviewCount: 68,
        compatibleVehicles: [],
        partNumber: "MICHELIN-TYRE",
      },
    
      // 15. SUSPENSION — TVS Girling
      {
       
        name: "TVS Girling Suspension Component",
        description:
          "Suspension replacement component; verify dimensions and vehicle compatibility",
        brand: "TVS Girling",
        price: 1800,
        originalPrice: 2200,
        image: productImage("SuspensionCarousel.png"),
        category: "suspension",
        unit: "1 pc",
        stock: 10,
        iGenuine: false,
        rating: 4.4,
        reviewCount: 32,
        compatibleVehicles: [],
        partNumber: "TVS-SUSP-01",
      },
    ];

  await prisma.product.createMany({
    data:products
  })
  console.log(`created ${products.length} products`)
  console.log(`seed completed sucessfully`)
  process.exit(0)

  }catch(error){
    console.error("seed error:" , error)
    process.exit(1)
  }finally{
    await prisma.$disconnect()
  }
}

seedDB()
