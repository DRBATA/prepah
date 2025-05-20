import React from 'react';

interface Action {
  id: string;
  type: 'drink_water' | 'buy_product' | 'activity' | 'visit_location';
  title: string;
  description: string;
  amount_ml?: number;
  price?: number;
  points?: number;
  distance?: string;
  completed: boolean;
}

interface Venue {
  id: string;
  name: string;
  type: string;
  rating: number;
  distance: string;
  image?: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  points: number;
  image?: string;
  description: string;
}

interface ActionsViewProps {
  userProfile: any;
  selectedActions: Action[];
  nearbyVenues: Venue[];
  recommendedProducts: Product[];
  userPoints: number;
  onCompleteAction: (actionId: string) => void;
  onPurchaseProduct: (productId: string) => void;
}

const ActionsView: React.FC<ActionsViewProps> = ({
  userProfile,
  selectedActions,
  nearbyVenues,
  recommendedProducts,
  userPoints,
  onCompleteAction,
  onPurchaseProduct
}) => {
  return (
    <div className="view-container actions-view">
      <h2>Action Panel</h2>
      
      {/* Selected Actions */}
      <div className="selected-actions">
        <h3>Your Plan</h3>
        {selectedActions?.length > 0 ? (
          <div className="action-list">
            {selectedActions.map((action) => (
              <div 
                key={action.id} 
                className={`action-card ${action.type} ${action.completed ? 'completed' : ''}`}
              >
                <div className="action-header">
                  <h4>{action.title}</h4>
                  {action.completed && (
                    <span className="completed-badge">Completed</span>
                  )}
                </div>
                <p className="description">{action.description}</p>
                {action.amount_ml && (
                  <div className="amount">{action.amount_ml}ml</div>
                )}
                {!action.completed && (
                  <button 
                    className="complete-action" 
                    onClick={() => onCompleteAction(action.id)}
                  >
                    Complete
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No actions selected. Select recommendations to add them to your plan!</p>
        )}
      </div>
      
      {/* Nearby Hydration Spots */}
      <div className="nearby-venues">
        <h3>Nearby Hydration Spots</h3>
        {nearbyVenues?.length > 0 ? (
          <div className="venue-list">
            {nearbyVenues.map((venue) => (
              <div key={venue.id} className="venue-card">
                <div className="venue-image">
                  {venue.image ? (
                    <img src={venue.image} alt={venue.name} />
                  ) : (
                    <div className="placeholder-image"></div>
                  )}
                </div>
                <div className="venue-info">
                  <h4>{venue.name}</h4>
                  <p className="venue-type">{venue.type}</p>
                  <div className="venue-meta">
                    <span className="rating">★ {venue.rating}</span>
                    <span className="distance">{venue.distance}</span>
                  </div>
                </div>
                <button className="view-button">View</button>
              </div>
            ))}
          </div>
        ) : (
          <p>No hydration venues found nearby.</p>
        )}
      </div>
      
      {/* Product Recommendations */}
      <div className="product-recommendations">
        <div className="points-display">
          <span className="points-icon">🔶</span>
          <span className="points-amount">{userPoints} points</span>
        </div>
        
        <h3>Recommended Products</h3>
        {recommendedProducts?.length > 0 ? (
          <div className="product-list">
            {recommendedProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    <div className="placeholder-image"></div>
                  )}
                </div>
                <div className="product-info">
                  <h4>{product.name}</h4>
                  <p className="brand">{product.brand}</p>
                  <p className="description">{product.description}</p>
                  <div className="product-meta">
                    <span className="price">AED {product.price}</span>
                    <span className="points">🔶 {product.points}</span>
                  </div>
                </div>
                <button 
                  className="add-button"
                  onClick={() => onPurchaseProduct(product.id)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No product recommendations available.</p>
        )}
      </div>
    </div>
  );
};

export default ActionsView;
