const contentArea = document.getElementById('categoriesContainer');
const menuTypeCards = document.getElementById('menuTypeCards');
const selectedMenuLabel = document.getElementById('selectedMenuLabel');
const totalPriceLabel = document.getElementById('totalPrice');
const doneBtn = document.getElementById('doneBtn');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const modeLabel = document.getElementById('modeLabel');
const summaryPage = document.getElementById('summaryPage');
const summaryMenuType = document.getElementById('summaryMenuType');
const selectedItemsSummary = document.getElementById('selectedItemsSummary');
const summaryTotalPrice = document.getElementById('summaryTotalPrice');
const nutritionList = document.getElementById('nutritionList');
const allergensList = document.getElementById('allergensList');
const backBtn = document.getElementById('backBtn');

const SUPABASE_URL = 'https://mnupwxmiugokkzygqsnh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9VswbTFD0TPHomt7ESKoFQ_gMv_Ebrx';
const SUPABASE_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Accept: 'application/json'
};

let selectedMenuType = null;
let freeMode = false;
let selectedDishIds = [];
let isLoading = true;

function getMenuTypeById(menuTypeId) {
  return surveyData.menuTypes.find((type) => type.id === menuTypeId) || null;
}

function getCategoryLabel(categoryId) {
  const category = surveyData.categories.find((item) => item.id === categoryId);
  return category ? category.label : categoryId;
}

function getSelectedDishes() {
  return surveyData.dishes.filter((dish) => selectedDishIds.includes(dish.id));
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapDishTypeToCategory(dishType) {
  const normalized = (dishType || '').toLowerCase();
  if (normalized.includes('primi')) return 'firstCourse';
  if (normalized.includes('second')) return 'secondCourse';
  if (normalized.includes('contorni') || normalized.includes('side')) return 'sideDishes';
  if (normalized.includes('dessert') || normalized.includes('dolce')) return 'extras';
  if (normalized.includes('pane') || normalized.includes('bread')) return 'bread';
  if (normalized.includes('bevande') || normalized.includes('beverage')) return 'beverages';
  if (normalized.includes('pizza')) return 'pizza';
  if (normalized.includes('bowl')) return 'bowls';
  return 'extras';
}

function mapSupabaseMealToDish(meal) {
  return {
    id: `meal-${meal.id}`,
    name: meal.name || 'Unnamed dish',
    category: mapDishTypeToCategory(meal.dish_type || meal.category),
    description: meal.description || '',
    nutrients: meal.nutrients || {},
    allergens: meal.allergens || [],
    ingredients: meal.ingredients || [],
    tags: meal.tags || [],
    completeMeal: false,
    price: 0
  };
}

async function fetchSupabaseJSON(path) {
  const response = await fetch(`${SUPABASE_URL}${path}`, { headers: SUPABASE_HEADERS });
  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }
  return response.json();
}

async function loadRealtimeDishes() {
  try {
    const today = getTodayDate();
    let dailyMenus = await fetchSupabaseJSON(`/rest/v1/daily_menu?menu_date=eq.${today}&select=*`);
    if (!dailyMenus.length) {
      dailyMenus = await fetchSupabaseJSON('/rest/v1/daily_menu?select=*&order=menu_date.desc&limit=1');
    }
    if (!dailyMenus.length) {
      throw new Error('No daily menu found');
    }

    const menuId = dailyMenus[0].id;
    const meals = await fetchSupabaseJSON(`/rest/v1/meal?menu_id=eq.${menuId}&is_available=eq.true&select=*`);
    if (meals.length) {
      surveyData.dishes = meals.map(mapSupabaseMealToDish);
    }
  } catch (error) {
    console.error('Supabase load failed:', error);
  } finally {
    isLoading = false;
  }
}

function getCurrentTotal() {
  // Always return the applicable menu price.
  if (selectedMenuType && !freeMode) {
    return selectedMenuType.price;
  }
  if (freeMode) {
    const menuType = detectBestMenuType();
    return menuType ? menuType.price : 0;
  }
  return 0;
}

function getCategorySelectionCount(categoryId) {
  return getSelectedDishes().filter((dish) => dish.category === categoryId).length;
}

function isCompleteMealSelected() {
  return getSelectedDishes().some((dish) => dish.completeMeal);
}

function getAvailableMenuTypesForSelection(selectionIds) {
  const selected = surveyData.dishes.filter((dish) => selectionIds.includes(dish.id));
  return surveyData.menuTypes.filter((type) => {
    const totals = selected.reduce((acc, dish) => {
      acc[dish.category] = (acc[dish.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(totals).every(([category, count]) => {
      const maxAllowed = type.rules[category] ?? 0;
      if (maxAllowed === -1) return true; // Unlimited category
      return count <= maxAllowed;
    });
  });
}

function canSelectionFitAnyMenuType(selectionIds) {
  return getAvailableMenuTypesForSelection(selectionIds).length > 0;
}

function detectBestMenuType() {
  const candidates = getAvailableMenuTypesForSelection(selectedDishIds);
  if (!candidates.length) {
    return null;
  }
  return candidates.reduce((best, candidate) => {
    if (!best || candidate.price < best.price) {
      return candidate;
    }
    return best;
  }, null);
}

function isDishCompatible(dish) {
  if (!selectedMenuType) {
    return freeMode && canSelectionFitAnyMenuType(selectedDishIds.concat(dish.id));
  }
  const rules = selectedMenuType.rules;
  const selectionInCategory = getCategorySelectionCount(dish.category);
  const maxAllowed = rules[dish.category] ?? 0;
  
  // Handle unlimited categories (represented as -1)
  if (maxAllowed === -1) {
    return true;
  }
  
  if (selectionInCategory >= maxAllowed && !selectedDishIds.includes(dish.id)) {
    return false;
  }
  if (isCompleteMealSelected()) {
    return dish.completeMeal && selectedDishIds.includes(dish.id);
  }
  if (dish.completeMeal) {
    if (getSelectedDishes().some((selected) => selected.category === 'firstCourse' || selected.category === 'secondCourse' || selected.category === 'sideDishes')) {
      return false;
    }
  }
  if (dish.category === 'pizza' || dish.category === 'bowls') {
    return !getSelectedDishes().some((selected) => selected.category === 'firstCourse' || selected.category === 'secondCourse');
  }
  if (dish.category === 'firstCourse' || dish.category === 'secondCourse' || dish.category === 'sideDishes') {
    return !getSelectedDishes().some((selected) => selected.completeMeal);
  }
  return true;
}

function renderMenuTypeCards() {
  menuTypeCards.innerHTML = '';
  surveyData.menuTypes.forEach((menuType) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.disabled = freeMode;
    card.className = `menu-type-card ${selectedMenuType?.id === menuType.id ? 'active' : ''} ${freeMode ? 'readonly' : ''}`;
    card.innerHTML = `
      <div class="menu-type-head">
        <h3>${menuType.name}</h3>
        ${menuType.price ? `<span class="menu-price">€${menuType.price.toFixed(2)}</span>` : ''}
      </div>
      <p>${menuType.description}</p>`;
    card.addEventListener('click', () => {
      if (freeMode) return;
      if (selectedMenuType?.id === menuType.id) {
        selectedMenuType = null;
        selectedDishIds = [];
      } else {
        selectedMenuType = menuType;
        selectedDishIds = [];
        freeMode = false;
        toggleModeBtn.textContent = 'Switch to free selection';
        modeLabel.textContent = 'Menu mode';
      }
      renderInterface();
    });
    menuTypeCards.appendChild(card);
  });
}

function renderCategories() {
  contentArea.innerHTML = '';
  if (isLoading) {
    contentArea.innerHTML = '<p class="loading">Loading today\'s menu…</p>';
    return;
  }
  surveyData.categories.forEach((category) => {
    const section = document.createElement('section');
    section.className = 'category-section';
    section.innerHTML = `<h3>${category.label}</h3><div class="category-grid"></div>`;
    const grid = section.querySelector('.category-grid');
    const categoryDishes = surveyData.dishes.filter((dish) => dish.category === category.id);

    if (!categoryDishes.length) {
      grid.innerHTML = '<p>No items available today.</p>';
    }

    categoryDishes.forEach((dish) => {
      const dishCard = document.createElement('button');
      dishCard.type = 'button';
      const alreadySelected = selectedDishIds.includes(dish.id);
      const compatible = alreadySelected || isDishCompatible(dish);
      dishCard.className = `dish-card ${alreadySelected ? 'selected' : ''} ${!compatible ? 'unavailable' : ''}`;
      dishCard.innerHTML = `
        <div class="dish-summary">
          ${dish.image_url ? `<img class="dish-image" src="${dish.image_url}" alt="${dish.name}" />` : ''}
          <div>
            <h4>${dish.name}</h4>
          </div>
        </div>
        <div class="dish-meta">
          <span class="dish-label">${getCategoryLabel(dish.category)}</span>
        </div>
      `;
      dishCard.addEventListener('click', () => {
        if (!compatible) return;
        if (alreadySelected) {
          selectedDishIds = selectedDishIds.filter((id) => id !== dish.id);
        } else {
          if (selectedMenuType && getCategorySelectionCount(dish.category) >= (selectedMenuType.rules[dish.category] ?? 0)) {
            return;
          }
          if (dish.completeMeal) {
            selectedDishIds = selectedDishIds.filter((id) => !surveyData.dishes.find((selected) => selected.id === id).completeMeal);
          }
          selectedDishIds.push(dish.id);
        }

        renderInterface();
      });
      grid.appendChild(dishCard);
    });

    contentArea.appendChild(section);
  });
}

function updateSummaryPanel() {
  selectedMenuLabel.textContent = selectedMenuType ? selectedMenuType.name : freeMode ? 'Free selection' : 'No menu selected';
  if (freeMode) {
    totalPriceLabel.textContent = 'Price shown at completion';
  } else if (selectedMenuType) {
    totalPriceLabel.textContent = `€${getCurrentTotal().toFixed(2)}`;
  } else {
    totalPriceLabel.textContent = 'No price until menu type selected';
  }
}

function renderInterface() {
  renderMenuTypeCards();
  renderCategories();
  updateSummaryPanel();
}

function showSummaryPage() {
  const dishes = getSelectedDishes();
  const menuType = selectedMenuType || (freeMode ? detectBestMenuType() : null);
  summaryMenuType.textContent = `Menu type: ${menuType ? menuType.name : freeMode ? 'Free selection (no matching menu)' : 'No assigned menu'}`;
  selectedItemsSummary.innerHTML = dishes.length ? dishes.map((dish) => {
    return `
    <div class="dish-card selected">
      <h4>${dish.name}</h4>
      <p>${getCategoryLabel(dish.category)}</p>
    </div>
  `}).join('') : '<p>No dishes selected.</p>';
  
  const totalPrice = menuType ? menuType.price : 0;
  summaryTotalPrice.textContent = `€${totalPrice.toFixed(2)}`;

  const totalNutrition = dishes.reduce((acc, dish) => {
    Object.entries(dish.nutrients).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value;
    });
    return acc;
  }, {});

  nutritionList.innerHTML = Object.entries(totalNutrition).map(([key, value]) => `<li>${key}: ${value}</li>`).join('');
  const allergens = [...new Set(dishes.flatMap((dish) => dish.allergens))];
  allergensList.textContent = allergens.length ? allergens.join(', ') : 'None';
  summaryPage.classList.remove('hidden');
}

menuTypeCards.addEventListener('click', (event) => {
  if (event.target.closest('.menu-type-card')) {
    renderInterface();
  }
});

doneBtn.addEventListener('click', showSummaryPage);
backBtn.addEventListener('click', () => {
  summaryPage.classList.add('hidden');
});

toggleModeBtn.addEventListener('click', () => {
  freeMode = !freeMode;
  selectedMenuType = null;
  if (freeMode) {
    if (!canSelectionFitAnyMenuType(selectedDishIds)) {
      selectedDishIds = [];
    }
    toggleModeBtn.textContent = 'Switch to menu mode';
    modeLabel.textContent = 'Free selection';
  } else {
    selectedDishIds = [];
    toggleModeBtn.textContent = 'Switch to free selection';
    modeLabel.textContent = 'Menu mode';
  }
  renderInterface();
});

loadRealtimeDishes().then(renderInterface).catch((error) => {
  console.error(error);
  isLoading = false;
  renderInterface();
});
