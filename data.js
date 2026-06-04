const surveyData = {
  menuTypes: [
    {
      id: 'extra-light',
      name: 'Extra light',
      description: 'One first course, no second course, one or two sides, one extra, one bread, and unlimited beverages.',
      price: 3.62,
      rules: {
        firstCourse: 1,
        secondCourse: 0,
        sideDishes: 2,
        extras: 1,
        bread: 1,
        beverages: -1,
        pizza: 0,
        bowls: 0
      }
    },
    {
      id: 'light',
      name: 'Light',
      description: 'No first course, one second course, one or two sides, one extra, one bread, and unlimited beverages.',
      price: 4.67,
      rules: {
        firstCourse: 0,
        secondCourse: 1,
        sideDishes: 2,
        extras: 1,
        bread: 1,
        beverages: -1,
        pizza: 0,
        bowls: 0
      }
    },
    {
      id: 'full',
      name: 'Full',
      description: 'One first course, one second course, one or two sides, two extras, one bread, and unlimited beverages.',
      price: 5.37,
      rules: {
        firstCourse: 1,
        secondCourse: 1,
        sideDishes: 2,
        extras: 2,
        bread: 1,
        beverages: -1,
        pizza: 0,
        bowls: 0
      }
    },
    {
      id: 'pizza',
      name: 'Pizza',
      description: 'No first or second course, one extra, one pizza, and unlimited beverages.',
      price: 5.37,
      rules: {
        firstCourse: 0,
        secondCourse: 0,
        sideDishes: 0,
        extras: 1,
        bread: 0,
        beverages: -1,
        pizza: 1,
        bowls: 0
      }
    },
    {
      id: 'light-pizza',
      name: 'Light pizza',
      description: 'One pizza, and unlimited beverages.',
      price: 4.67,
      rules: {
        firstCourse: 0,
        secondCourse: 0,
        sideDishes: 0,
        extras: 0,
        bread: 0,
        beverages: -1,
        pizza: 1,
        bowls: 0
      }
    },
    {
      id: 'bowl',
      name: 'Bowl',
      description: 'One bowl, one extra, one bread, and unlimited beverages.',
      price: 5.67,
      rules: {
        firstCourse: 0,
        secondCourse: 0,
        sideDishes: 0,
        extras: 1,
        bread: 1,
        beverages: -1,
        pizza: 0,
        bowls: 1
      }
    }
  ],
  categories: [
    { id: 'firstCourse', label: 'First course' },
    { id: 'secondCourse', label: 'Second course' },
    { id: 'sideDishes', label: 'Side dishes' },
    { id: 'extras', label: 'Extras' },
    { id: 'bread', label: 'Bread' },
    { id: 'beverages', label: 'Beverages' },
    { id: 'pizza', label: 'Pizza' },
    { id: 'bowls', label: 'Bowls' }
  ],
  dishes: [
    {
      id: 'chocolate-pudding',
      name: 'Chocolate pudding',
      category: 'extras',
      price: 2.2,
      description: 'Rich chocolate dessert available at lunch and dinner.',
      nutrients: { calories: 250, protein: 4, carbs: 35, fat: 11 },
      allergens: ['milk'],
      ingredients: ['cacao'],
      tags: ['dessert']
    },
    {
      id: 'vanilla-pudding',
      name: 'Vanilla pudding',
      category: 'extras',
      price: 2.2,
      description: 'Creamy vanilla pudding served with a soft texture.',
      nutrients: { calories: 240, protein: 4, carbs: 33, fat: 10 },
      allergens: ['milk'],
      ingredients: ['vanilla'],
      tags: ['dessert']
    },
    {
      id: 'organic-yoghurt',
      name: 'Organic yoghurt',
      category: 'extras',
      price: 2.5,
      description: 'Natural organic yoghurt, perfect as a light dessert.',
      nutrients: { calories: 140, protein: 6, carbs: 16, fat: 4 },
      allergens: ['milk'],
      ingredients: ['milk'],
      tags: ['dessert']
    },
    {
      id: 'fresh-bread',
      name: 'Fresh bread',
      category: 'bread',
      price: 1.1,
      description: 'Fresh bread from the bakery, served daily.',
      nutrients: { calories: 180, protein: 5, carbs: 32, fat: 2 },
      allergens: ['gluten', 'wheat', 'milk', 'eggs', 'soy', 'nuts', 'mustard', 'sesame', 'lupin'],
      ingredients: ['wheat'],
      tags: ['vegan']
    },
    {
      id: 'mixed-seasonal-salad',
      name: 'Mixed seasonal salad (spring)',
      category: 'sideDishes',
      price: 2.7,
      description: 'Seasonal salad with carrots, cabbage, tomato, cucumber and fennel.',
      nutrients: { calories: 95, protein: 2, carbs: 12, fat: 4 },
      allergens: ['sulphur dioxide'],
      ingredients: ['carrots', 'cabbage', 'salad', 'tomato', 'mais', 'cucumber', 'olive oil', 'fennel'],
      tags: ['vegetarian']
    },
    {
      id: 'big-salad',
      name: 'Big salad',
      category: 'bowls',
      price: 6.8,
      description: 'Large salad bowl with mixed greens and seasonal toppings.',
      nutrients: { calories: 260, protein: 6, carbs: 20, fat: 14 },
      allergens: ['mustard', 'milk', 'sulphur dioxide'],
      ingredients: ['lettuce', 'cabbage', 'tomato', 'carrots'],
      tags: ['vegetarian'],
      completeMeal: true
    },
    {
      id: 'bowl-of-the-day',
      name: 'Bowl of the day',
      category: 'bowls',
      price: 8.5,
      description: 'Daily bowl with grains, vegetables and proteins.',
      nutrients: { calories: 520, protein: 28, carbs: 60, fat: 20 },
      allergens: ['gluten', 'soy', 'milk', 'nuts', 'fish', 'eggs'],
      ingredients: ['beans', 'rice', 'corn', 'emmer', 'pesto', 'tomatoes', 'bell peppers', 'chickpeas', 'soy sauce', 'smoked salmon', 'apples', 'pasta', 'dried tomatoes', 'lentils', 'tofu', 'eggs', 'zucchini', 'carrots', 'cucumber', 'couscous', 'mozzarella', 'black olive', 'barley', 'chicken', 'green olives', 'black rice', 'green beans'],
      tags: ['special'],
      completeMeal: true
    },
    {
      id: 'pasta-or-rice-with-beef-ragù',
      name: 'Pasta or rice with beef ragù',
      category: 'firstCourse',
      price: 5.7,
      description: 'Classic beef ragù with choice of pasta or rice.',
      nutrients: { calories: 500, protein: 22, carbs: 58, fat: 18 },
      allergens: ['gluten', 'soy'],
      ingredients: ['pasta', 'rice', 'beef', 'tomatoes', 'carrots', 'onions', 'olive oil', 'black pepper', 'salt'],
      tags: ['classic']
    },
    {
      id: 'pasta-or-rice-with-oil-vegan',
      name: 'Pasta or rice with oil (VEGAN)',
      category: 'firstCourse',
      price: 4.8,
      description: 'Simple vegan pasta or rice with olive oil and seasoning.',
      nutrients: { calories: 340, protein: 8, carbs: 60, fat: 8 },
      allergens: ['gluten', 'soy'],
      ingredients: ['pasta', 'rice', 'olive oil', 'salt'],
      tags: ['vegan']
    },
    {
      id: 'pasta-or-rice-with-tomato-sauce-vegan',
      name: 'Pasta or rice with tomato sauce (VEGAN)',
      category: 'firstCourse',
      price: 4.9,
      description: 'Vegan pasta or rice served with tomato sauce and basil.',
      nutrients: { calories: 360, protein: 9, carbs: 62, fat: 8 },
      allergens: ['gluten', 'soy'],
      ingredients: ['pasta', 'rice', 'tomatoes', 'carrots', 'onions', 'basil', 'olive oil', 'salt'],
      tags: ['vegan']
    },
    {
      id: 'pizza-of-the-day',
      name: 'Pizza',
      category: 'pizza',
      price: 7.5,
      description: 'Slice of pizza prepared fresh daily.',
      nutrients: { calories: 650, protein: 22, carbs: 80, fat: 24 },
      allergens: ['gluten', 'milk', 'pork'],
      ingredients: ['barley', 'wheat', 'milk', 'tomato paste', 'carrots', 'chicken and turkey wrustel', 'salt', 'bell peppers', 'oregano', 'black pepper', 'spicy sausage', 'eggplant'],
      tags: ['classic'],
      completeMeal: true
    },
    {
      id: 'piadina-of-the-day',
      name: 'Piadina of the day',
      category: 'pizza',
      price: 7.0,
      description: 'Daily filled piadina with cheese and cold cuts.',
      nutrients: { calories: 620, protein: 24, carbs: 70, fat: 22 },
      allergens: ['gluten', 'milk', 'pork', 'soy', 'sesame'],
      ingredients: ['wheat', 'asiago', 'emmental', 'edamer', 'lettuce', 'mortadella', 'ham', 'radish', 'speck', 'cabbage', 'salt'],
      tags: ['classic'],
      completeMeal: true
    },
    {
      id: 'crepes-of-the-day',
      name: 'Crepes of the day*',
      category: 'secondCourse',
      price: 5.8,
      description: 'Savory daily crepe with seasonal filling.',
      nutrients: { calories: 420, protein: 18, carbs: 45, fat: 18 },
      allergens: ['gluten', 'milk', 'pork', 'eggs'],
      ingredients: ['eggs', 'milk', 'edamer', 'ham', 'flour', 'fontina', 'asiago', 'montasio'],
      tags: ['special']
    },
    {
      id: 'risotto-al-radicchio',
      name: 'Risotto al radicchio',
      category: 'firstCourse',
      price: 5.0,
      description: 'Creamy radicchio risotto with grana padano.',
      nutrients: { calories: 430, protein: 10, carbs: 55, fat: 18 },
      allergens: ['celery', 'milk', 'eggs'],
      ingredients: ['rice', 'radish', 'grana padano', 'celery', 'carrots', 'onions', 'butter', 'olive oil', 'salt'],
      tags: ['vegetarian']
    },
    {
      id: 'curried-vegetable-pasta-salad-vegan',
      name: 'Curried Vegetable pasta Salad (VEGAN)',
      category: 'firstCourse',
      price: 5.1,
      description: 'Pasta salad with curry and grilled vegetables.',
      nutrients: { calories: 380, protein: 9, carbs: 58, fat: 12 },
      allergens: ['gluten', 'peanuts', 'soy', 'nuts', 'celery', 'mustard', 'sulphur dioxide'],
      ingredients: ['pasta', 'carrots', 'zucchinis', 'peppers', 'eggplants', 'onions', 'olive oil', 'flour', 'basil', 'rosemary', 'parsley', 'curry', 'salt'],
      tags: ['vegan']
    },
    {
      id: 'bauerngrostl',
      name: 'Bauerngršstl',
      category: 'secondCourse',
      price: 7.0,
      description: 'Hearty farmer-style dish with beef, potatoes and onions.',
      nutrients: { calories: 520, protein: 22, carbs: 36, fat: 28 },
      allergens: ['celery', 'milk'],
      ingredients: ['beef', 'onions', 'potatoes', 'butter', 'olive oil', 'parsley', 'black pepper', 'salt', 'celery', 'broth'],
      tags: ['classic']
    },
    {
      id: 'savory-pie-with-chard-herbs-and-asiago',
      name: 'Savory pie with chard, herbs and Asiago DOP',
      category: 'secondCourse',
      price: 6.5,
      description: 'Savory pie filled with chard, herbs and Asiago cheese.',
      nutrients: { calories: 490, protein: 16, carbs: 40, fat: 28 },
      allergens: ['gluten', 'milk', 'eggs', 'fish', 'soy', 'mustard'],
      ingredients: ['wheat', 'milk', 'eggs', 'olive oil', 'biet', 'asiago', 'grana padano', 'onions', 'salt'],
      tags: ['vegetarian']
    },
    {
      id: 'baked-chickpea-falafel-vegan',
      name: 'Baked Chickpea Falafel* (VEGAN)',
      category: 'secondCourse',
      price: 6.8,
      description: 'Oven-baked chickpea falafels with tomato sauce.',
      nutrients: { calories: 430, protein: 16, carbs: 40, fat: 22 },
      allergens: ['gluten', 'eggs', 'fish', 'soy', 'milk', 'celery'],
      ingredients: ['falafel', 'olive oil', 'salt'],
      tags: ['vegan']
    },
    {
      id: 'peas-in-stew',
      name: 'Peas in stew',
      category: 'sideDishes',
      price: 2.5,
      description: 'Stewed peas with tomato, onion and basil.',
      nutrients: { calories: 120, protein: 5, carbs: 18, fat: 4 },
      allergens: ['celery'],
      ingredients: ['peas', 'tomato paste', 'carrots', 'onions', 'olive oil', 'basil', 'salt'],
      tags: ['vegan']
    },
    {
      id: 'caponata-bio',
      name: 'Caponata BIO',
      category: 'sideDishes',
      price: 2.7,
      description: 'Organic caponata with peppers, aubergines, potatoes and carrots.',
      nutrients: { calories: 130, protein: 3, carbs: 18, fat: 6 },
      allergens: [],
      ingredients: ['carrots', 'potatoes', 'bell peppers', 'eggplant', 'olive oil', 'onions', 'garlic', 'salt'],
      tags: ['vegan']
    },
    {
      id: 'cake-of-the-day',
      name: 'Cake of the day*',
      category: 'extras',
      price: 2.2,
      description: 'Daily cake dessert with seasonal fruit flavors.',
      nutrients: { calories: 330, protein: 5, carbs: 45, fat: 15 },
      allergens: ['gluten', 'nuts', 'eggs', 'milk'],
      ingredients: ['wheat', 'nuts', 'eggs', 'milk'],
      tags: ['dessert']
    },
    {
      id: 'soy-spaghetti-with-vegetables',
      name: 'Soy spaghetti with vegetables',
      category: 'firstCourse',
      price: 5.0,
      description: 'Soy spaghetti with mixed vegetables and savory seasoning.',
      nutrients: { calories: 360, protein: 10, carbs: 52, fat: 12 },
      allergens: ['gluten', 'soy'],
      ingredients: ['soybeans vermicelli', 'zucchini', 'onions', 'soy sauce', 'black pepper', 'carrots', 'salt'],
      tags: ['vegan']
    },
    {
      id: 'sparkling-water',
      name: 'Sparkling Water',
      category: 'beverages',
      price: 1.0,
      description: 'Chilled natural sparkling water.',
      nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      allergens: [],
      ingredients: ['water', 'carbon dioxide'],
      tags: ['vegan']
    },
    {
      id: 'green-juice',
      name: 'Green Juice',
      category: 'beverages',
      price: 1.8,
      description: 'Cucumber, apple, spinach and lemon juice.',
      nutrients: { calories: 95, protein: 2, carbs: 22, fat: 0 },
      allergens: [],
      ingredients: ['cucumber', 'apple', 'spinach', 'lemon'],
      tags: ['vegan', 'light']
    }
  ]
};
