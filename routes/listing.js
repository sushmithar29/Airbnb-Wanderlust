const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const { listingSchema } = require('../schema.js');
const { isLoggedIn, isOwner, validateListing } = require('../middleware.js');
const multer=require('multer');
const { storage } = require('../cloudConfig.js');
const upload=multer({ storage });
const Listing = require('../models/listing.js');

const getCoordinates = async (location, country) => {
  const query = `${location}, ${country}`;
  const geocodeUrl = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&access_token=${encodeURIComponent(process.env.MAP_TOKEN)}`;
  const geocodeResponse = await fetch(geocodeUrl);

  if (geocodeResponse.ok) {
    const geocodeData = await geocodeResponse.json();
    const coordinates = geocodeData.features[0]?.geometry.coordinates;
    if (coordinates) return coordinates;
  }

  const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const fallbackResponse = await fetch(fallbackUrl, {
    headers: { 'User-Agent': 'Wanderlust listing map' }
  });
  if (!fallbackResponse.ok) return null;

  const fallbackData = await fallbackResponse.json();
  if (!fallbackData[0]) return null;
  return [Number(fallbackData[0].lon), Number(fallbackData[0].lat)];
};


const listingsController = {
  index: async (req, res) => {
    const allListings = await Listing.find({});
    res.render('listings/index', { allListings });
  },

  renderNewForm: (req, res) => {
    res.render('listings/new.ejs');
  },

  createListing: async (req, res) => {
    const newListing = new Listing(req.body.listing);
    const uploadedFile = req.file || (req.files && Object.values(req.files).flat()[0]);
    if (uploadedFile) {
      newListing.image = {
        filename: uploadedFile.filename,
        url: uploadedFile.path
      };
    }
    const coordinates = await getCoordinates(newListing.location, newListing.country);
    if (coordinates) {
      newListing.geometry = { type: 'Point', coordinates };
    }
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash('success', 'Successfully created a new listing!');
    res.redirect('/listings');
  },

  showListing: async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
      .populate({ path: 'reviews', populate: { path: 'author' } })
      .populate('owner');

    if (!listing) {
      req.flash('error', 'Listing not found!');
      return res.redirect('/listings');
    }
      if (!listing.geometry?.coordinates?.length) {
        const coordinates = await getCoordinates(listing.location, listing.country);
        if (coordinates) {
          listing.geometry = { type: 'Point', coordinates };
          await listing.save();
        }
      }
      res.render('listings/show.ejs', {
        listing,
        mapToken: process.env.MAP_TOKEN,
        coordinates: listing.geometry?.coordinates || []
      });
  },

  renderEditForm: async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
      .populate({ path: 'reviews', populate: { path: 'author' } })
      .populate('owner');

    if (!listing) {
      req.flash('error', 'Listing not found!');
      return res.redirect('/listings');
    }
    res.render('listings/edit.ejs', { listing });
  },

  updateListing: async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });
    const coordinates = await getCoordinates(listing.location, listing.country);
    if (coordinates) {
      listing.geometry = { type: 'Point', coordinates };
    }
    const uploadedFile = req.file || (req.files && req.files[0]);
    if (uploadedFile) {
      listing.image = {
        filename: uploadedFile.filename,
        url: uploadedFile.path
      };
    }
    await listing.save();
    req.flash('success', 'Successfully updated the listing!');
    res.redirect(`/listings/${id}`);
  },

  destroyListing: async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted the listing!');
    res.redirect('/listings');
  }
};

router.route('/')
  .get(wrapAsync(listingsController.index))
  .post(
    isLoggedIn,
    upload.any(),
    validateListing,
    wrapAsync(listingsController.createListing)
  );

router.route('/new')
  .get(isLoggedIn, listingsController.renderNewForm);

router.route('/:id')
  .get(wrapAsync(listingsController.showListing))
  .put(isLoggedIn,
     isOwner,
      upload.any(),
     validateListing,
      wrapAsync(listingsController.updateListing)
    )
  .delete(isLoggedIn, isOwner, wrapAsync(listingsController.destroyListing));

router.route('/:id/edit')
  .get(isLoggedIn, isOwner, wrapAsync(listingsController.renderEditForm));

module.exports = router;