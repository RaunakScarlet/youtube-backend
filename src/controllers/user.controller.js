const registerUser = async (req, res, next) => {
  try {
    return await res.status(200).json({
      success: true,
      message: "ok",
    });
  } catch (error) {
    console.log(error);
  }
};

export { registerUser };
