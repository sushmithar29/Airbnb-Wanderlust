const Listing = require("../models/listing");

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_SEARCH_URL = "https://photon.komoot.io/api/";
let lastGeocodeRequestAt = 0;

async function respectGeocodeRateLimit() {
    const waitTime = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt));
    if (waitTime) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastGeocodeRequestAt = Date.now();
}

async function getGeometry(location, country) {
    const query = [location, country].filter(Boolean).join(", ");
    if (!query) return null;

    const url = new URL(NOMINATIM_SEARCH_URL);
    url.search = new URLSearchParams({ q: query, format: "jsonv2", limit: "1" });

    try {
        await respectGeocodeRateLimit();
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Wanderlust/1.0 (https://github.com/sushmithar29/Airbnb-Wanderlust)",
                "Accept-Language": "en",
            },
        });
        if (response.ok) {
            const [place] = await response.json();
            const longitude = Number(place?.lon);
            const latitude = Number(place?.lat);

            if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
                return { type: "Point", coordinates: [longitude, latitude] };
            }
        }
    } catch (err) {
        console.error("Primary geocoder unavailable:", err.message);
    }

    // Use a backup geocoder so listings still receive a map if Nominatim is
    // rate-limited or temporarily unavailable.
    try {
        const fallbackUrl = new URL(PHOTON_SEARCH_URL);
        fallbackUrl.search = new URLSearchParams({ q: query, limit: "1" });
        const response = await fetch(fallbackUrl);
        if (!response.ok) return null;

        const [longitude, latitude] = (await response.json())
            .features?.[0]?.geometry?.coordinates || [];

        if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
            return { type: "Point", coordinates: [longitude, latitude] };
        }
    } catch (err) {
        console.error("Backup geocoder unavailable:", err.message);
    }

    return null;
}

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    const listing = await Listing.findById(req.params.id)
        .populate({ path: "reviews", populate: "author" })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested does not exist.");
        return res.redirect("/listings");
    }

    if (listing.geometry?.coordinates?.length !== 2) {
        const geometry = await getGeometry(listing.location, listing.country);
        if (geometry) {
            listing.geometry = geometry;
            await listing.save();
        }
    }

    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    const geometry = await getGeometry(newListing.location, newListing.country);
    if (geometry) newListing.geometry = geometry;

    if (req.file) {
        newListing.image = {
            url: req.file.path,
            filename: req.file.filename,
        };
    }

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect(`/listings/${newListing._id}`);
};

module.exports.renderEditForm = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        req.flash("error", "Listing you requested does not exist.");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image?.url;
    if (originalImageUrl?.includes("/upload/")) {
        originalImageUrl = originalImageUrl.replace(
            "/upload/",
            "/upload/w_250,c_fill/"
        );
    }

    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    const { id } = req.params;
    const updatedListing = await Listing.findById(id);

    if (!updatedListing) {
        req.flash("error", "Listing you requested does not exist.");
        return res.redirect("/listings");
    }

    const locationChanged =
        updatedListing.location !== req.body.listing.location ||
        updatedListing.country !== req.body.listing.country;

    if (locationChanged) {
        const geometry = await getGeometry(
            req.body.listing.location,
            req.body.listing.country
        );
        if (geometry) updatedListing.geometry = geometry;
    }

    Object.assign(updatedListing, req.body.listing);

    if (req.file) {
        updatedListing.image = {
            url: req.file.path,
            filename: req.file.filename,
        };
    }

    await updatedListing.save();

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};
