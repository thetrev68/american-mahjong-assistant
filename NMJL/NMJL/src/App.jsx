import React, { useState } from 'react';

// For simplicity, we'll use inline SVG for the icons.
const PlusIcon = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const FileDownIcon = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 17V3" />
    <path d="m6 11 6 6 6-6" />
    <path d="M19 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2" />
  </svg>
);

const Trash2Icon = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

const App = () => {
  // Use state to manage the card data.
  const [cardCategories, setCardCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // State for building a new hand
  const [currentHandName, setCurrentHandName] = useState('');
  const [currentHandPoints, setCurrentHandPoints] = useState('');
  const [currentHandSets, setCurrentHandSets] = useState([]);
  
  // State for building a new set within the current hand
  const [newSetSuit, setNewSetSuit] = useState('');
  const [newSetTiles, setNewSetTiles] = useState('');

  // Function to add a new category
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      setCardCategories([...cardCategories, { name: newCategoryName, hands: [] }]);
      setNewCategoryName('');
    }
  };

  // Function to add a new set to the current hand being built
  const handleAddSet = (e) => {
    e.preventDefault();
    if (newSetSuit.trim() && newSetTiles.trim()) {
      const tilesArray = newSetTiles.split(',').map(tile => tile.trim());
      setCurrentHandSets([...currentHandSets, { suit: newSetSuit, tiles: tilesArray }]);
      setNewSetSuit('');
      setNewSetTiles('');
    }
  };

  // Function to add the complete current hand to a specific category
  const handleAddHandToCategory = (e, categoryIndex) => {
    e.preventDefault();
    if (currentHandName.trim() && currentHandPoints && currentHandSets.length > 0) {
      const updatedCategories = [...cardCategories];
      updatedCategories[categoryIndex].hands.push({
        name: currentHandName,
        sets: currentHandSets, // Now storing an array of sets
        points: parseInt(currentHandPoints, 10),
      });
      setCardCategories(updatedCategories);

      // Reset the hand builder form
      setCurrentHandName('');
      setCurrentHandPoints('');
      setCurrentHandSets([]);
    }
  };

  // Function to remove a hand
  const handleRemoveHand = (categoryIndex, handIndex) => {
    const updatedCategories = [...cardCategories];
    updatedCategories[categoryIndex].hands.splice(handIndex, 1);
    setCardCategories(updatedCategories);
  };
  
  // Function to remove a set from the hand builder
  const handleRemoveSet = (setIndex) => {
    const updatedSets = [...currentHandSets];
    updatedSets.splice(setIndex, 1);
    setCurrentHandSets(updatedSets);
  };


  // Function to remove a category and all its hands
  const handleRemoveCategory = (categoryIndex) => {
    const updatedCategories = [...cardCategories];
    updatedCategories.splice(categoryIndex, 1);
    setCardCategories(updatedCategories);
  };

  // Function to export the data as a JSON file
  const handleExportJson = () => {
    const cardData = {
      year: "2025",
      cardCategories: cardCategories,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(cardData, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = 'nmjl-2025-card.json';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4 font-sans antialiased flex flex-col items-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
      
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl space-y-8 my-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">NMJL 2025 Card Editor</h1>
          <button
            onClick={handleExportJson}
            className="mt-4 sm:mt-0 flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg transition-colors duration-200"
          >
            <FileDownIcon size={20} />
            Export JSON
          </button>
        </div>

        {/* Add New Category Section */}
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl shadow-inner">
          <input
            type="text"
            placeholder="New Category Name (e.g., 'Winds-Dragons')"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-grow px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200"
          >
            <PlusIcon size={20} />
            Add Category
          </button>
        </form>

        {/* Existing Categories and Hands */}
        <div className="space-y-6">
          {cardCategories.length > 0 ? (
            cardCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="p-5 bg-gray-50 dark:bg-gray-700 rounded-xl shadow-md border border-gray-200 dark:border-gray-600 relative">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">{category.name}</h2>
                  <button onClick={() => handleRemoveCategory(categoryIndex)} className="text-gray-400 hover:text-red-500 transition-colors duration-200">
                    <Trash2Icon size={20} />
                  </button>
                </div>

                {/* List of Hands */}
                <div className="space-y-4 mb-4">
                  {category.hands.map((hand, handIndex) => (
                    <div key={handIndex} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-medium">{hand.name} ({hand.points} pts)</p>
                        <button onClick={() => handleRemoveHand(categoryIndex, handIndex)} className="text-gray-400 hover:text-red-500 transition-colors duration-200 ml-4">
                          <Trash2Icon size={18} />
                        </button>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                        {hand.sets.map((set, setIndex) => (
                          <div key={setIndex} className="flex gap-2 items-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Suit: {set.suit}</span>
                            <span className="text-sm">Tiles: {set.tiles.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form to add a new hand to this category */}
                <form onSubmit={(e) => handleAddHandToCategory(e, categoryIndex)} className="flex flex-col gap-2 mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h3 className="font-medium text-gray-800 dark:text-white mb-2">Add New Hand to {category.name}</h3>
                  <input
                    type="text"
                    placeholder="Hand Name (e.g., '2025 Any Hand')"
                    value={currentHandName}
                    onChange={(e) => setCurrentHandName(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Points"
                    value={currentHandPoints}
                    onChange={(e) => setCurrentHandPoints(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  
                  {/* Current Hand Sets Display */}
                  {currentHandSets.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="font-semibold">Current Hand Sets:</p>
                      {currentHandSets.map((set, setIndex) => (
                        <div key={setIndex} className="flex justify-between items-center bg-gray-200 dark:bg-gray-700 p-2 rounded-md">
                          <p className="text-sm">
                            <span className="font-medium">Suit:</span> {set.suit} | <span className="font-medium">Tiles:</span> {set.tiles.join(', ')}
                          </p>
                          <button type="button" onClick={() => handleRemoveSet(setIndex)} className="text-gray-500 hover:text-red-500">
                             <Trash2Icon size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Set Form */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Set Suit (e.g., 'blue', 'red')"
                      value={newSetSuit}
                      onChange={(e) => setNewSetSuit(e.target.value)}
                      className="w-1/3 px-3 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Set Tiles (comma-separated, e.g., 'F,F,F,F')"
                      value={newSetTiles}
                      onChange={(e) => setNewSetTiles(e.target.value)}
                      className="flex-grow px-3 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSet}
                      className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white font-medium rounded-lg shadow-md transition-colors duration-200"
                    >
                      <PlusIcon size={16} />
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200 disabled:bg-gray-400"
                    disabled={!currentHandName || !currentHandPoints || currentHandSets.length === 0}
                  >
                    <PlusIcon size={16} />
                    Add Hand
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 p-8 rounded-xl bg-white dark:bg-gray-800 shadow-inner">
              Start by adding your first category above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
