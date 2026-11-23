// ============================================
// Multi-Classifier Comparison — Navrongo 2025
// SVM vs CART vs Gradient Tree Boost
// ============================================

// 1. Load Assets
var boundary = ee.FeatureCollection('users/yinelishebayinbemi/Navrongo_Study_Area_UTM');
var training_polygons = ee.FeatureCollection('users/yinelishebayinbemi/Training_Polygons_WGS84');

// 2. Load Sentinel-2 Image
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(boundary)
  .filterDate('2025-03-01', '2025-03-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .median()
  .clip(boundary);

// 3. Compute Spectral Indices
var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndbi = s2.normalizedDifference(['B11', 'B8']).rename('NDBI');
var bsi = s2.expression(
  '((B11 + B4) - (B8 + B2)) / ((B11 + B4) + (B8 + B2))',
  {
    'B11': s2.select('B11'),
    'B4': s2.select('B4'),
    'B8': s2.select('B8'),
    'B2': s2.select('B2')
  }).rename('BSI');

// 4. Stack Bands + Indices
var image = s2.select(['B2','B3','B4','B8','B11','B12'])
  .addBands(ndvi)
  .addBands(ndbi)
  .addBands(bsi);

var bands = ['B2','B3','B4','B8','B11','B12','NDVI','NDBI','BSI'];

// 5. Sample Training Data
var training = image.sampleRegions({
  collection: training_polygons,
  properties: ['ClassNum'],
  scale: 10
});

print('Training size:', training.size());

// 6. Train Three Classifiers

// SVM
var svm = ee.Classifier.libsvm({
  kernelType: 'RBF',
  gamma: 0.5,
  cost: 10
}).train({
  features: training,
  classProperty: 'ClassNum',
  inputProperties: bands
});

// CART
var cart = ee.Classifier.smileCart()
  .train({
    features: training,
    classProperty: 'ClassNum',
    inputProperties: bands
  });

// Gradient Tree Boost
var gtb = ee.Classifier.smileGradientTreeBoost(50)
  .train({
    features: training,
    classProperty: 'ClassNum',
    inputProperties: bands
  });

// 7. Classify with each
var classified_svm = image.classify(svm);
var classified_cart = image.classify(cart);
var classified_gtb = image.classify(gtb);

// 8. Display all three
var palette = {min: 1, max: 4, palette: ['grey', 'green', 'yellow', 'blue']};

Map.centerObject(boundary, 13);
Map.addLayer(classified_svm, palette, 'SVM Classification');
Map.addLayer(classified_cart, palette, 'CART Classification');
Map.addLayer(classified_gtb, palette, 'Gradient Tree Boost');
Map.addLayer(boundary, {color: 'red'}, 'Study Area');

print('All classifiers complete');

// 9. Export all three
Export.image.toDrive({
  image: classified_svm,
  description: 'RF_Classification_SVM',
  folder: 'GEE_Exports',
  fileNamePrefix: 'RF_Classification_SVM',
  region: boundary.geometry(),
  scale: 10,
  crs: 'EPSG:32630',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: classified_cart,
  description: 'RF_Classification_CART',
  folder: 'GEE_Exports',
  fileNamePrefix: 'RF_Classification_CART',
  region: boundary.geometry(),
  scale: 10,
  crs: 'EPSG:32630',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: classified_gtb,
  description: 'RF_Classification_GTB',
  folder: 'GEE_Exports',
  fileNamePrefix: 'RF_Classification_GTB',
  region: boundary.geometry(),
  scale: 10,
  crs: 'EPSG:32630',
  maxPixels: 1e13
});
