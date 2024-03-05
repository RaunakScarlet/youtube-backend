import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
const registerUser = async (req, res, next) => {
  try {
    // 1. extract user details
    // 2. validate fields
    // 3. check already exits
    // 4. check for image & then upload on cloudinary
    // 5. create entry in DB
    // 6. remove not necessary fields like password, refreshtoken,etc.
    // 7. check user creation whether its not undifined or null
    // 8. return user

    const { fullName, username, email, password } = req.body;
    console.log(fullName, username, email, password);

    if (
      [fullName, username, email, password].some(
        (field) => field?.trim() === ""
      )
    ) {
      throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existedUser) {
      throw new ApiError(400, "User already existed");
    }

    const avatarImageLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarImageLocalPath) {
      throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarImageLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
      throw new ApiError(400, "Avatar image is required");
    }

    const user = await User.create({
      fullName,
      avatar: avatar?.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "something went wrong while registering user");
    }
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "successfully created user"));
  } catch (error) {
    console.log("Error from registerUser", error);
  }
};

export { registerUser };
