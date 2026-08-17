
import styles from "./page.module.css";
import Storefronts from "./storefront";

//  no HTML, body, or main -> outlined in Layout.tsx
export default function Home() {
  return (
    <div className="flex justify-center">
      <div className="invisible"> 
      </div>
      <div className="content-center"> 
        <div className="grid flex justify-center">
          <h1 className="text-xl font-bold font-archivo">
          SHOP CANNAN - COMING SOON!
          </h1>
          <div className="flex justify-center">
            <p className="font-archivo content-center"> Something handmade is on the way.</p>
          </div>
        </div>
        <div className="flex justify-center"> 
          <Storefronts/>
        </div>
      </div>
    </div>
  );
}
