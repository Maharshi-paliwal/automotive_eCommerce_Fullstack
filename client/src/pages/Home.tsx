import Features from "../components/Home/Features";
import Hero1 from "../components/Home/Hero1";
import PopularProducts from "../components/Home/PopularProducts";
import PromoBanner from "../components/Home/PromoBanner";
import HomeBrands from "../components/Home/HomeBrands";
import CategoriesHome from "../components/Home/CategoriesHome";
import NewsLetter from "../components/Home/NewsLetter";

const Home = () => {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Hero1 />
      <Features />
      <HomeBrands />
      <PopularProducts/>
      <CategoriesHome/>
      <PromoBanner/>
      <NewsLetter/>
    </div>
  );
};

export default Home;
