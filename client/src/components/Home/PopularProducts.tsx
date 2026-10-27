import { useState , useEffect} from "react"
import type { Product } from "../../types"
import { dummyProducts } from "../../assets/assets"
import { ArrowRightIcon } from "lucide-react"
import { Link } from "react-router-dom"
import ProductCard from "../ProductCard"
const PopularProducts = () => {
  const [Product, setProduct] = useState<Product[]>([])

  useEffect(()=>{
    setProduct(dummyProducts.slice(0,10))

  },[])
  return (
    <section className="pb-16">
      <div className="mas-w-8xl mx-auto">
        <div className="flex items-center justofy-between mb-8">
<div>
  <h2 className="text-2xl font-semibold">Popular Products</h2>
  <p className="text-sm text-app-text-light mt-1">Top-rated products this season</p>
</div>
<Link to="/products" className="text-sm font-semibold text-app-amber hover:text-app-amber-dark flex items-center gap-1 transition-colors absolute right-10"> View All <ArrowRightIcon className="size-4"/>
</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 xl:gap-8">
        {Product.map((product)=>{
          return(
            <ProductCard key={product._id} product={product}/>
          )
        })}
        </div>
      </div>
    </section>
  )
}

export default PopularProducts