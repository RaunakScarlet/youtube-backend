import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access or refresh token"
    );
  }
};

const registerUser = async (req, res) => {
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

    console.log("ab", avatarImageLocalPath);

    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files?.coverImage[0]?.path;
    }
    console.log("ced", coverImageLocalPath);

    if (!avatarImageLocalPath) {
      console.log("hello");
      throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarImageLocalPath);
    console.log("avatar", avatar.url);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
      throw new ApiError(400, "Avatar image is required");
    }

    const user = await User.create({
      fullName,
      avatar: avatar.url,
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

const loginUser = async (req, res) => {
  //1. req.body--->username,email,password
  //2. find user
  //3. comapre password
  //4. send tokens with cookies
  const { username, email, password } = req.body;
  if (!(username || email)) {
    throw new ApiError(400, "send correct username or email");
  }
  const findUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!findUser) {
    throw new ApiError(400, "User not found");
  }
  const isValidUser = await findUser.isPasswordCorrect(password);
  if (!isValidUser) {
    throw new ApiError(400, "Invalid credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    findUser._id
  );
  const loggedinUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedinUser, accessToken, refreshToken },
        "user loggedin successfully"
      )
    );
};

const logoutUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      { new: true }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "user logged out successfully"));
  } catch (error) {
    throw new ApiError(401, "Unauthorised Access");
  }
};

export { registerUser, loginUser, logoutUser };
